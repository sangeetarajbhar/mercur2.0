import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework'
import { fetchControlSettings, type ControlSettings} from './fetch-control-settings'
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
  omni_location_id?: string | null
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



const cache = new Map<string, { value: unknown; expiry: number }>()

function getCache<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    cache.delete(key)
    return null
  }
  return entry.value as T
}

function setCache(key: string, value: unknown, ttl: number) {
  cache.set(key, {
    value,
    expiry: Date.now() + ttl
  })
}

//cache implementation

// In-flight de-dupe: prevents stampede on cache misses.
const controlInFlight = new Map<string, Promise<ControlSettings>>()
const hoursInFlight = new Map<string, Promise<LocationTiming>>()
type SlottedPrepared = Awaited<ReturnType<typeof prepareSlottedDeliveryLocation>>
const slottedInFlight = new Map<string, Promise<SlottedPrepared>>()
const omniExtraInFlight = new Map<string, Promise<number>>()
type EffectiveInstantPromise = Awaited<ReturnType<typeof getEffectiveInstantPromise>>
const effectiveInstantInFlight = new Map<string, Promise<EffectiveInstantPromise>>()

async function getOrSetCacheWithInFlight<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number,
  inFlight: Map<string, Promise<T>>
): Promise<T> {
  const cached = getCache<T>(key)
  if (cached) return cached

  const existing = inFlight.get(key)
  if (existing) return existing

  const promise = fn()
  inFlight.set(key, promise)

  try {
    const result = await promise
    setCache(key, result, ttl)
    return result
  } finally {
    inFlight.delete(key)
  }
}


export async function calculateDeliveryPromiseFromZone({
  scope,
  zone_id,
  location_id,
  seller_id,
  variant_id,
  omni_location_id
}: CalculateDeliveryPromiseInput): Promise<DeliveryPromiseErrorResult | DeliveryPromiseResult> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const now = new Date()

  try {
    const controlCacheKey = `control:${zone_id}:${location_id}`

    let controlSettings: ControlSettings

    const cached = getCache<ControlSettings>(controlCacheKey)
    if (cached) {
      controlSettings = cached
    } else if (controlInFlight.has(controlCacheKey)) {
      controlSettings = await controlInFlight.get(controlCacheKey)!
    } else {
      const promise = fetchControlSettings(query, zone_id, location_id)
      controlInFlight.set(controlCacheKey, promise)

      try {
        controlSettings = await promise
        setCache(controlCacheKey, controlSettings, 5 * 60 * 1000) // 5 min
      } finally {
        controlInFlight.delete(controlCacheKey)
      }
    }

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

      const prepared = await getOrSetCacheWithInFlight(
        `slotted:${location_id}:${omni_location_id || 'auto'}:${variant_id || 'none'}:${seller_id}`,
        () =>
          prepareSlottedDeliveryLocation({
            scope,
            location_id,
            variant_id,
            seller_id,
            omni_location_id
          }),
        60 * 1000,
        slottedInFlight
      )

      slottedLocationId = prepared.slottedLocationId
      locationHours = prepared.locationHours

    } else {
      locationHours = await getOrSetCacheWithInFlight(
        `hours:${location_id}`,
        () => fetchLocationTiming(scope, location_id),
        30 * 60 * 1000,
        hoursInFlight
      )
    }


    // if (seller_id && seller_id !== process.env.ZILO_SELLER_ID) {
      
    //   const prepared = await prepareSlottedDeliveryLocation({
    //     scope,
    //     location_id,
    //     variant_id,
    //     seller_id,
    //     // now,
    //     omni_location_id
    //   })

    //   slottedLocationId = prepared.slottedLocationId
    //   locationHours = prepared.locationHours
      
    // } else {
    //   // console.log("else",location_id)
    //   locationHours = await fetchLocationTiming(scope, location_id)
    // }

    /** When omni seller resolves to a child omni under DS, extra minutes come from location_hierarchy.promise_minutes */
    let omniExtraPromiseMinutes = 0
    if (
      seller_id &&
      seller_id !== process.env.ZILO_SELLER_ID &&
      slottedLocationId !== location_id
    ) {
      const omniExtraCacheKey = `omni-extra:${location_id}:${slottedLocationId}`
      omniExtraPromiseMinutes = await getOrSetCacheWithInFlight(
        omniExtraCacheKey,
        () =>
          getOmniExtraPromiseMinutesForDsAndChild(
            query,
            location_id,
            slottedLocationId
          ),
        30 * 60 * 1000,
        omniExtraInFlight
      )
    }

    const instantCacheKey = `instant-effective:${zone_id}:${seller_id || 'none'}:${location_id}:${slottedLocationId}:${controlSettings.delayMinutes}:${omniExtraPromiseMinutes}`
    const effectiveInstantPromise = await getOrSetCacheWithInFlight(
      instantCacheKey,
      () =>
        getEffectiveInstantPromise(
          query,
          zone_id,
          controlSettings,
          seller_id || '',
          omniExtraPromiseMinutes
        ),
      60 * 1000,
      effectiveInstantInFlight
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

    // console.log("result",result)
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

    // console.log("slot result",result)

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
