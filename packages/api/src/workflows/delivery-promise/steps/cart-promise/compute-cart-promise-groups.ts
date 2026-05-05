import type { MedusaContainer } from '@medusajs/framework'
import type { CartLineItem } from './fetch-cart-line-items'
import type { ServiceableVariant } from './check-variant-serviceability'
import type { ZoneData } from './fetch-zone-by-pincode'
import type { DeliveryOption, DeliveryPromiseGroup, DeliveryPromiseMinutes } from './build-cart-promise-response'
import type { DeliveryPromiseResult as InstantPromiseData } from '../calculate-delivery-promise-from-zone'
import type { AvailableSlots } from './fetch-available-slots'
import type { InventoryLevel } from './fetch-inventory-levels'
import type { VariantInventoryMapping } from './fetch-variant-inventory'
import { filterSlotsByOmniTiming } from './filter-slots-by-omni-timing'
import { fetchControlSettings } from '../fetch-control-settings'
import { getEffectiveInstantPromise, type EffectiveInstantPromise } from '../calculate-instant-delivery'
import { fetchAvailableSlots } from './fetch-available-slots'
import { fetchLocationTiming } from '../../../../modules/zone/utils/location-timing'
import { addMinutes, createISTDateTime, getTodayIST, parseHHMM } from '../../utils/date-time-utils'

export type ComputeCartPromiseGroupsInput = {
  scope: MedusaContainer
  zone: ZoneData
  query: any
  lineItems: CartLineItem[]
  inventoryLevels: InventoryLevel[]
  variants: VariantInventoryMapping[]
  omniPromiseMinutesByChildLocation?: Map<string, number>
  lineItemTryAndBuyMap?: Map<string, boolean>
}

export type ComputeCartPromiseGroupsResult = {
  deliveryPromiseGroupsData: DeliveryPromiseGroup[]
}

type FulfillmentDescriptor = {
  dedupeKey: string  // Pure promise time: "${promiseTime}"
  kind: 'zilo' | 'omni' | 'mixed'  // mixed = both zilo and omni items in same group
  lineItemIds: string[]
  lineItemToLocationMap: Map<string, string | null>  // itemId -> omniLocationId (null for zilo items)
  totalPromiseMinutes: number
}

function groupEtaMinutes(g: DeliveryPromiseGroup): number {
  const m = g.minutes?.total ?? g.instant_promise?.delivery_minutes
  return m != null && Number.isFinite(m) ? m : Number.MAX_SAFE_INTEGER
}

/**
 * Builds fulfillment descriptors grouped by PROMISE TIME (not seller/location).
 * Items with the same total promise minutes are grouped together regardless of seller/location.
 * 
 * OPTIMIZATION: Zone-level data (control settings, base promise, zone slots) fetched ONCE.
 * Per group only adjusts: slot filtering based on representative location hours.
 */
export async function computeCartPromiseGroups({
  scope,
  zone,
  query,
  lineItems,
  inventoryLevels,
  variants,
  omniPromiseMinutesByChildLocation,
  lineItemTryAndBuyMap
}: ComputeCartPromiseGroupsInput): Promise<ComputeCartPromiseGroupsResult> {
  const ziloSellerId = process.env.ZILO_SELLER_ID

  // STEP 1: Fetch zone-level data ONCE (needed to calculate promise times)
  const controlSettings = await fetchControlSettings(query, zone.id, zone.location_id)
  
  // Base effective promise WITHOUT omni extra
  const baseEffectivePromise = await getEffectiveInstantPromise(
    query,
    zone.id,
    controlSettings,
    '', // No seller = no omni extra in base
    0   // No omni extra
  )
  
  const baseNetMinutes = baseEffectivePromise?.netPromiseMinutes ?? 0
  
  // Fetch zone slots ONCE
  const zoneSlots = await fetchAvailableSlots(zone.id, query, controlSettings)

  // Build variant_id -> inventory_item_id map
  const variantToInventoryMap = new Map<string, string>()
  for (const v of variants) {
    variantToInventoryMap.set(v.variant_id, v.inventory_item_id)
  }
  
  // Build inventory_item_id -> location_ids with stock map
  const inventoryToLocationsMap = new Map<string, string[]>()
  for (const level of inventoryLevels) {
    const availableQty = Math.max(0, level.stocked_quantity - level.reserved_quantity)
    if (availableQty > 0) {
      const existing = inventoryToLocationsMap.get(level.inventory_item_id) || []
      if (!existing.includes(level.location_id)) {
        existing.push(level.location_id)
      }
      inventoryToLocationsMap.set(level.inventory_item_id, existing)
    }
  }

  // Build line_item_id -> omni_location_id and calculate promise time per item
  const lineItemPromiseData = new Map<string, {
    lineItem: CartLineItem
    omniLocationId: string | null
    omniExtraMinutes: number
    totalPromiseMinutes: number
    isZilo: boolean
  }>()

  for (const li of lineItems) {
    const isZilo = ziloSellerId ? li.seller_id === ziloSellerId : false

    let omniLocationId: string | null = null
    let omniExtraMinutes = 0

    if (!isZilo) {
      // Find Omni location for this item
      const inventoryItemId = variantToInventoryMap.get(li.variant_id)
      if (inventoryItemId) {
        const locations = inventoryToLocationsMap.get(inventoryItemId) || []
        omniLocationId = locations.find(loc => loc !== zone.location_id) || null
        omniExtraMinutes = omniLocationId
          ? (omniPromiseMinutesByChildLocation?.get(omniLocationId) ?? 0)
          : 0
      }
    }

    const totalPromiseMinutes = baseNetMinutes + omniExtraMinutes

    lineItemPromiseData.set(li.id, {
      lineItem: li,
      omniLocationId,
      omniExtraMinutes,
      totalPromiseMinutes,
      isZilo
    })
  }

  // Group ALL items by TOTAL PROMISE TIME (Zilo + Omni together)
  const itemsByPromiseTime = new Map<number, CartLineItem[]>()

  for (const [_, data] of lineItemPromiseData) {
    const key = data.totalPromiseMinutes
    if (!itemsByPromiseTime.has(key)) {
      itemsByPromiseTime.set(key, [])
    }
    itemsByPromiseTime.get(key)!.push(data.lineItem)
  }

  // Build descriptors grouped purely by promise time (no zilo/omni separation)
  const descriptors: FulfillmentDescriptor[] = []

  for (const [promiseTime, items] of itemsByPromiseTime) {
    if (!items.length) continue

    // Build map of all item locations in this group
    const lineItemToLocationMap = new Map<string, string | null>()
    for (const item of items) {
      const itemData = lineItemPromiseData.get(item.id)!
      lineItemToLocationMap.set(item.id, itemData.omniLocationId)
    }

    descriptors.push({
      dedupeKey: String(promiseTime),  // Pure promise time as key
      kind: 'mixed',  // Group can contain both zilo and omni items
      lineItemIds: items.map((i) => i.id),
      lineItemToLocationMap,
      totalPromiseMinutes: promiseTime
    })
  }

  console.log('descriptors', descriptors)
  console.log('ziloSellerId', ziloSellerId)
  console.log('lineItemPromiseData', lineItemPromiseData)

  // STEP 2: Process each descriptor in PARALLEL for better performance
  const now = new Date()
  const todayStr = getTodayIST(now)

  const groupPromises = descriptors.map(async (desc): Promise<DeliveryPromiseGroup> => {
    let locationHours: { start_time: string | null; end_time: string | null }

    // ALWAYS include DS location + all Omni locations for intersection
    const uniqueLocationIds = new Set<string>()
    uniqueLocationIds.add(zone.location_id)  // DS is always included

    // Add all Omni locations from items in this group
    for (const [_, locationId] of desc.lineItemToLocationMap) {
      if (locationId) uniqueLocationIds.add(locationId)
    }

    // Fetch hours for ALL locations (DS + Omni) and calculate intersection
    const allHours = await Promise.all(
      Array.from(uniqueLocationIds).map(locId => fetchLocationTiming(scope, locId))
    )

    // Find latest opening time (max of all start times) - DS + all Omni
    const startTimes = allHours
      .map(h => parseHHMM(h.start_time))
      .filter((h): h is { h: number; m: number } => h !== null)

    const latestStart = startTimes.length > 0
      ? startTimes.reduce((max, curr) =>
          curr.h * 60 + curr.m > max.h * 60 + max.m ? curr : max
        )
      : null

    // Find earliest closing time (min of all end times) - DS + all Omni
    const endTimes = allHours
      .map(h => parseHHMM(h.end_time))
      .filter((h): h is { h: number; m: number } => h !== null)

    const earliestEnd = endTimes.length > 0
      ? endTimes.reduce((min, curr) =>
          curr.h * 60 + curr.m < min.h * 60 + min.m ? curr : min
        )
      : null

    // Build intersection hours (most restrictive across DS + all Omni)
    const latestStartStr = latestStart
      ? `${String(latestStart.h).padStart(2, '0')}:${String(latestStart.m).padStart(2, '0')}`
      : null
    const earliestEndStr = earliestEnd
      ? `${String(earliestEnd.h).padStart(2, '0')}:${String(earliestEnd.m).padStart(2, '0')}`
      : null

    locationHours = {
      start_time: latestStartStr,
      end_time: earliestEndStr
    }

    console.log('Group intersection hours (DS + all Omni):', {
      promiseTime: desc.totalPromiseMinutes,
      uniqueLocations: Array.from(uniqueLocationIds),
      allStartTimes: allHours.map(h => h.start_time),
      allEndTimes: allHours.map(h => h.end_time),
      intersection: locationHours
    })

    // Build effective promise for this group
    let effectivePromise: EffectiveInstantPromise | null = null
    let minutesBreakdown: DeliveryPromiseMinutes = { base: 0, omni_extra: 0, total: 0 }

    if (baseEffectivePromise) {
      const baseNetMinutes = baseEffectivePromise.netPromiseMinutes
      // Calculate omniExtra from the difference between total and base
      const omniExtra = desc.totalPromiseMinutes - baseNetMinutes
      const totalMinutes = desc.totalPromiseMinutes

      minutesBreakdown = {
        base: baseNetMinutes,
        omni_extra: omniExtra,
        total: totalMinutes
      }

      // Build promise config with total minutes
      effectivePromise = {
        ...baseEffectivePromise,
        promiseMinutes: baseEffectivePromise.promiseMinutes + omniExtra,
        displayMinutes: baseEffectivePromise.displayMinutes + omniExtra,
        netPromiseMinutes: totalMinutes
      }
    }

    // Calculate instant promise using INTERSECTION hours
    let instantPromise: InstantPromiseData | null = null
    if (controlSettings.isInstantEnabled && effectivePromise) {
      const locationStart = parseHHMM(locationHours.start_time)
      const locationEnd = parseHHMM(locationHours.end_time)
      const eta = addMinutes(now, effectivePromise.promiseMinutes)

      const etaDateStr = eta.toISOString().split('T')[0]

      // Check if instant delivery possible with INTERSECTION hours
      let canDeliverInstant = true
      const nowDateStr = now.toISOString().split('T')[0]
      if (etaDateStr !== nowDateStr) {
        canDeliverInstant = false
      } else if (locationStart && locationEnd) {
        const [year, month, day] = todayStr.split('-').map(Number)
        const startToday = new Date(year, month - 1, day, locationStart.h, locationStart.m, 0, 0)
        const endToday = new Date(year, month - 1, day, locationEnd.h, locationEnd.m, 0, 0)

        // Must be: after latest opening AND before earliest closing AND ETA before earliest close
        if (now < startToday || now >= endToday || eta > endToday) {
          canDeliverInstant = false
        }
      }

      if (canDeliverInstant) {
        const baseMessage = effectivePromise.promiseText || `Delivery in ${effectivePromise.displayMinutes} minutes`
        instantPromise = {
          status: true,
          location_id: zone.location_id,
          eta_iso: eta.toISOString(),
          message: baseMessage,
          delivery_type: 'instant',
          delivery_date: etaDateStr,
          delivery_minutes: effectivePromise.displayMinutes
        }
      }
    }

    // Compute slot window using INTERSECTION hours
    let minSlotStartTime: Date | null = null
    let maxSlotEndTime: Date | null = null

    const startParsed = parseHHMM(locationHours.start_time)
    if (startParsed) {
      const startStr = `${String(startParsed.h).padStart(2, '0')}:${String(startParsed.m).padStart(2, '0')}`
      const startDateTime = createISTDateTime(todayStr, startStr)
      minSlotStartTime = addMinutes(startDateTime, effectivePromise?.netPromiseMinutes ?? 0)
    }

    const endParsed = parseHHMM(locationHours.end_time)
    if (endParsed) {
      const endStr = `${String(endParsed.h).padStart(2, '0')}:${String(endParsed.m).padStart(2, '0')}`
      maxSlotEndTime = createISTDateTime(todayStr, endStr)
    }

    // Determine if group has any Omni items (for slot filtering)
    const hasOmniItems = Array.from(desc.lineItemToLocationMap.values()).some(locId => locId !== null)

    // Filter zone slots using INTERSECTION window
    const slotsToUse = await filterSlotsByOmniTiming({
      scope,
      zone,
      lineItems: desc.lineItemIds.map((id) => {
        const li = lineItems.find((x) => x.id === id)!
        return { variant_id: li.variant_id, seller_id: li.seller_id ?? '' }
      }),
      availableSlots: zoneSlots,
      slotWindow: { minSlotStartTime, maxSlotEndTime },
      hasOmni: hasOmniItems,
      ziloSellerId
    })

    // Build promise key based on PURE PROMISE TIME (just minutes, no kind prefix)
    const promise_key = String(minutesBreakdown.total)
    const allItemsTryAndBuy = desc.lineItemIds.length > 0
      ? desc.lineItemIds.every((id) => lineItemTryAndBuyMap?.get(id) === true)
      : false
    const delivery_options: DeliveryOption[] = [
      { key: 'standard', eligible: true },
      { key: 'home_trial', eligible: allItemsTryAndBuy }
    ]

    return {
      promise_key,
      kind: desc.kind,
      minutes: minutesBreakdown,
      instant_promise: instantPromise,
      available_slots: slotsToUse,
      delivery_options,
      line_item_ids: [...desc.lineItemIds],
      locations_included: Array.from(uniqueLocationIds)  // All locations (DS + Omni) in this group
    }
  })

  // Execute all group calculations in PARALLEL
  const deliveryGroups = await Promise.all(groupPromises)

  // Return all unique promise time groups
  return { deliveryPromiseGroupsData: deliveryGroups }
}
