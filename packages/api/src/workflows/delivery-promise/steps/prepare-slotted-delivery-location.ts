import { MedusaContainer } from '@medusajs/framework'
import { fetchOmniLocationIdByClusterVariant } from './fetch-omniLocationId-By-cluster-variant'
import { fetchLocationTiming } from '../../../modules/zone/utils/location-timing'
// import { addMinutes, parseHHMM, createISTDateTime, getTodayIST } from '../utils/date-time-utils'
import { type LocationTiming } from '../../../modules/zone/utils/location-timing'

export type PrepareSlottedDeliveryLocationInput = {
    scope: MedusaContainer
    location_id: string
    variant_id?: string
    seller_id?: string | null
    now: Date
}

export type PrepareSlottedDeliveryLocationOutput = {
    slottedLocationId: string
    // minSlotStartTime: Date | null
    // maxSlotEndTime: Date | null
    locationHours: LocationTiming
}

/**
 * Prepares location and timing for slotted delivery
 * - For non-zilo sellers with variant_id, fetches omni location where variant is available
 * - Calculates minSlotStartTime (location start time + 60 minutes) for non-zilo sellers
 * 
 * @param input - Contains scope, location_id, variant_id, seller_id, and current time
 * @returns Object with slottedLocationId and minSlotStartTime
 */
export async function prepareSlottedDeliveryLocation({
    scope,
    location_id,
    variant_id,
    seller_id,
    now
}: PrepareSlottedDeliveryLocationInput): Promise<PrepareSlottedDeliveryLocationOutput> {
    let slottedLocationId = location_id
    let minSlotStartTime: Date | null = null
    let maxSlotEndTime: Date | null = null
    let locationHours: LocationTiming = { start_time: null, end_time: null }

    // For non-zilo sellers with variant_id, try to find omni location where variant is available
    if (variant_id && seller_id && seller_id !== process.env.ZILO_SELLER_ID) {
        const omniLocationId = await fetchOmniLocationIdByClusterVariant({
            scope,
            cluster_id: location_id,
            variant_id: variant_id
        })
        if (omniLocationId) {
            slottedLocationId = omniLocationId
        }
        // Calculate minSlotStartTime for non-zilo sellers
        const locationTiming = await fetchLocationTiming(scope, slottedLocationId)
        locationHours = {
            start_time: locationTiming.start_time,
            end_time: locationTiming.end_time
        }

        // if (locationTiming.start_time) {
        //     const todayStr = getTodayIST(now)
        //     const startTimeParsed = parseHHMM(locationTiming.start_time)

        //     if (startTimeParsed) {
        //         const startTimeStr = `${String(startTimeParsed.h).padStart(2, '0')}:${String(startTimeParsed.m).padStart(2, '0')}`
        //         const locationStartDateTime = createISTDateTime(todayStr, startTimeStr)
        //         minSlotStartTime = addMinutes(locationStartDateTime, 60)
        //     }
        // }

        // if (locationTiming.end_time) {
        //     const todayStr = getTodayIST(now)
        //     const endTimeParsed = parseHHMM(locationTiming.end_time)

        //     if (endTimeParsed) {
        //         const endTimeStr = `${String(endTimeParsed.h).padStart(2, '0')}:${String(endTimeParsed.m).padStart(2, '0')}`
        //         const locationEndDateTime = createISTDateTime(todayStr, endTimeStr)
        //         maxSlotEndTime = locationEndDateTime
        //     }
        // }

    }

    return {
        slottedLocationId,
        // minSlotStartTime,
        // maxSlotEndTime,
        locationHours
    }
}

