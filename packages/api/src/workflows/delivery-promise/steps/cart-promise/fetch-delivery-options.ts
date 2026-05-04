import { fetchControlSettings } from '../fetch-control-settings'
import { calculateInstantDelivery } from '../calculate-instant-delivery'
import { prepareSlottedDeliveryLocation } from '../prepare-slotted-delivery-location'
import { fetchAvailableSlots } from './fetch-available-slots'
import type { DeliveryPromiseResult as InstantPromiseData } from '../calculate-delivery-promise-from-zone'
import type { AvailableSlots } from './fetch-available-slots'
import type { ZoneData } from './fetch-zone-by-pincode'
import type { MedusaContainer } from '@medusajs/framework'
import { getOmniExtraPromiseMinutesForDsAndChild } from '../../../../shared/utils/location-hierarchy'
import { fetchLocationTiming, LocationTiming } from '../../../../modules/zone/utils/location-timing'

export type DeliveryOptions = {
  instantPromise: InstantPromiseData | null
  availableSlots: AvailableSlots
}

/**
 * Fetches all delivery options for a zone and location
 * This includes:
 * - Control settings (instant/slotted enabled flags)
 * - Location operating hours
 * - Instant delivery promise (if enabled)
 * - Available delivery slots (if enabled)
 * 
 * @param zone - Zone data with id and location_id
 * @param query - Query service
 * @param seller_id - Optional seller ID for seller-specific delivery calculations
 * @returns Delivery options including instant promise and available slots
 */
export async function fetchDeliveryOptions(
  zone: ZoneData,
  query: any,
  options: {
    scope: MedusaContainer
    variant_id: string | null
  },
  seller_id?: string | null,

): Promise<DeliveryOptions> {
  const zone_id = zone.id
  const darkStoreLocationId = zone.location_id
  let locationId = darkStoreLocationId
  let omniExtraPromiseMinutes = 0

  // Fetch control settings for zone and location
  const controlSettings = await fetchControlSettings(query, zone_id, locationId)

  // Resolve omni location + timings for non-zilo seller when variant is available.
  // This keeps cart instant promise aligned with omni operating hours, same as PDP/PLP.
  // let locationHours = await fetchLocationOperatingHours(query, locationId)
  let locationHours = await fetchLocationTiming(options?.scope, locationId)

  if (
    options?.scope &&
    options?.variant_id &&
    seller_id &&
    seller_id !== process.env.ZILO_SELLER_ID
  ) {
    const prepared = await prepareSlottedDeliveryLocation({
      scope: options.scope,
      location_id: darkStoreLocationId,
      variant_id: options.variant_id,
      seller_id,
      // now: new Date(),
    })
    if (prepared.slottedLocationId !== darkStoreLocationId) {
      omniExtraPromiseMinutes = await getOmniExtraPromiseMinutesForDsAndChild(
        query,
        darkStoreLocationId,
        prepared.slottedLocationId
      )
    }
    locationId = prepared.slottedLocationId
    locationHours = prepared.locationHours
  }

  // Calculate instant promise if enabled
  let instantPromise: InstantPromiseData | null = null
  if (controlSettings.isInstantEnabled) {

    // instantPromise = await calculateInstantDelivery(
    //   query,
    //   zone_id,
    //   locationId,
    //   new Date(),
    //   controlSettings,
    //   locationHours,
    //   seller_id || '',
    //   omniExtraPromiseMinutes
    // )

    instantPromise = await calculateInstantDelivery(
      query,
      locationHours,
      new Date(),
      controlSettings,
      locationId
    )
  }

  // Fetch available slots if slotted delivery is enabled
  const availableSlots = await fetchAvailableSlots(
    zone_id,
    // locationId,
    query,
    controlSettings,
    // scope
  )

  return {
    instantPromise,
    availableSlots
  }
}

