import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework'
import { fetchControlSettings } from './fetch-control-settings'
import { fetchLocationOperatingHours, type LocationOperatingHours } from './fetch-location-hours'
import { calculateInstantDelivery } from './calculate-instant-delivery'
import { calculateSlottedDelivery } from './calculate-slotted-delivery'
import { prepareSlottedDeliveryLocation } from './prepare-slotted-delivery-location'

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
    // console.log('controlSettings: ')
    // console.log(controlSettings, { depth: null, colors: true})

    // Check if any delivery options are available
    if (!controlSettings.isInstantEnabled && !controlSettings.isSlottedEnabled) {
      return {
        status: false,
        message: 'Area is not serviceable - no delivery options available',
        error: 'NO_DELIVERY_OPTIONS'
      }
    }

    // Resolve location + hours to use for promise calculations.
    // For non-zilo sellers, use omni location (if resolved) + its operating hours for BOTH instant and slotted.
    let slottedLocationId = location_id
    let minSlotStartTime: Date | null = null
    let maxSlotEndTime: Date | null = null
    let locationHours: LocationOperatingHours = { startTime: null, endTime: null }

    if (seller_id && seller_id !== process.env.ZILO_SELLER_ID) {
      const prepared = await prepareSlottedDeliveryLocation({
        scope,
        location_id,
        variant_id,
        seller_id,
        now
      })

      slottedLocationId = prepared.slottedLocationId
      minSlotStartTime = prepared.minSlotStartTime
      maxSlotEndTime = prepared.maxSlotEndTime
      locationHours = prepared.locationHours
      
      if (!locationHours.startTime && !locationHours.endTime) {
        locationHours = await fetchLocationOperatingHours(query, slottedLocationId)
      }
    } else {
      locationHours = await fetchLocationOperatingHours(query, location_id)
    }

    // console.log("locationHours",locationHours)
    // console.log("minSlotStartTime",minSlotStartTime)
    // console.log("maxSlotEndTime",maxSlotEndTime)
    // console.log("slottedLocationId",slottedLocationId)
    // console.log("seller_id",seller_id)
    
    let result: DeliveryPromiseResult | null = null

    // Try instant delivery first (only shows if delivery is possible TODAY)
    if (controlSettings.isInstantEnabled) {
      result = await calculateInstantDelivery(
        query,
        zone_id,
        location_id,
        now,
        controlSettings,
        locationHours,
        seller_id || ''
      )
    }

    if (!result && controlSettings.isSlottedEnabled) {

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
