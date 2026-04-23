import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework'
import { fetchControlSettings } from './fetch-control-settings'
import { calculateInstantDelivery, getEffectiveInstantPromise } from './calculate-instant-delivery'
import { calculateSlottedDelivery } from './calculate-slotted-delivery'
import { prepareSlottedDeliveryLocation } from './prepare-slotted-delivery-location'
import { getOmniExtraPromiseMinutesForDsAndChild } from '../../../shared/utils/location-hierarchy'
import { fetchLocationTiming, LocationTiming } from '../../../modules/zone/utils/location-timing'
import { addMinutes, createISTDateTime, getTodayIST, parseHHMM } from '../utils/date-time-utils'

export type CalculateDeliveryPromiseInput = {
  scope: MedusaContainer
  zone_id: string
  location_id: string
  seller_id?: string | null
  variant_id?: string
}

export type DeliveryPromiseResult = {
  status?: boolean
  location_id: string
  eta_iso?: string
  message?: string
  delay?: boolean
  delay_message?: string | null
  message_icon?: string | null
  delivery_type?: 'instant' | 'slotted'
  delivery_date?: string  // Date of delivery in YYYY-MM-DD format
  delivery_minutes?: number
}

export type DeliveryPromiseErrorResult = {
  status: boolean
  error?: string
  message?: string
}

export async function calculateDeliveryPromiseFromZone({
  scope,
  zone_id,
  location_id,
  seller_id,
  variant_id
}: CalculateDeliveryPromiseInput): Promise<DeliveryPromiseErrorResult | DeliveryPromiseResult> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const now = new Date()

  try {
    // Fetch and merge control settings from zone and location
    const controlSettings = await fetchControlSettings(query, zone_id, location_id)

    if (!controlSettings.isInstantEnabled && !controlSettings.isSlottedEnabled) {
      return {
        status: false,
        message: 'Area is not serviceable - no delivery options available',
        error: 'NO_DELIVERY_OPTIONS'
      }
    }

    let slottedLocationId = location_id
    let minSlotStartTime: Date | null = null
    let maxSlotEndTime: Date | null = null
    let locationHours: LocationTiming = { start_time: null, end_time: null }

    if (seller_id && seller_id !== process.env.ZILO_SELLER_ID) {
      
      const prepared = await prepareSlottedDeliveryLocation({
        scope,
        location_id,
        variant_id,
        seller_id,
        now
      })

      slottedLocationId = prepared.slottedLocationId
      locationHours = prepared.locationHours
      
    } else {
      console.log("else",location_id)
      locationHours = await fetchLocationTiming(scope, location_id)
    }

    /** When omni seller resolves to a child omni under DS, extra minutes come from location_hierarchy.promise_minutes */
    let omniExtraPromiseMinutes = 0
    if (
      seller_id &&
      seller_id !== process.env.ZILO_SELLER_ID &&
      slottedLocationId !== location_id
    ) {
      omniExtraPromiseMinutes = await getOmniExtraPromiseMinutesForDsAndChild(
        query,
        location_id,
        slottedLocationId
      )
    }

    const effectiveInstantPromise = await getEffectiveInstantPromise(
      query,
      zone_id,
      controlSettings,
      seller_id || '',
      omniExtraPromiseMinutes
    )
    
    // console.log("effectiveInstantPromise",effectiveInstantPromise)
    let result: DeliveryPromiseResult | null = null

    // Try instant delivery first (only shows if delivery is possible TODAY)
    if (controlSettings.isInstantEnabled && effectiveInstantPromise) {
      result = await calculateInstantDelivery(
        effectiveInstantPromise,
        locationHours,
        now,
        controlSettings,
        location_id
      )
    }

    if (!result && controlSettings.isSlottedEnabled) {

      const startParsed = parseHHMM(locationHours.start_time)
      if (startParsed) {
        const todayStr = getTodayIST(now)
        const startStr = `${String(startParsed.h).padStart(2, '0')}:${String(startParsed.m).padStart(2, '0')}`
        const startDateTime = createISTDateTime(todayStr, startStr)
        minSlotStartTime = addMinutes(startDateTime, effectiveInstantPromise?.netPromiseMinutes ?? 0)
      }

      const endParsed = parseHHMM(locationHours.end_time)
      if (endParsed) {
        const todayStr = getTodayIST(now)
        const endStr = `${String(endParsed.h).padStart(2, '0')}:${String(endParsed.m).padStart(2, '0')}`
        maxSlotEndTime = createISTDateTime(todayStr, endStr)
      }

      // console.log("minSlotStartTime",minSlotStartTime)
      // console.log("maxSlotEndTime",maxSlotEndTime)

      result = await calculateSlottedDelivery(
        query,
        zone_id,
        slottedLocationId,
        now,
        controlSettings,
        minSlotStartTime || undefined,
        maxSlotEndTime || undefined
        // scope
      )

    }

    // Return error if no delivery promise is available
    if (!result) {
      return {
        status: false,
        message: 'No delivery promise available for this area',
        error: 'NO_PROMISE_AVAILABLE'
      }
    }

    return result

  } catch {
    return {
      status: false,
      message: 'Failed to compute delivery promise',
      error: 'COMPUTE_FAILED'
    }
  }
}
