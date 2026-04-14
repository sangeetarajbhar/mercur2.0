import { MedusaContainer } from '@medusajs/framework'
import { prepareSlottedDeliveryLocation } from '../prepare-slotted-delivery-location'
import { createISTDateTime, getTodayIST, getTomorrowIST, parseHHMM } from '../../utils/date-time-utils'
import type { AvailableSlots, DeliverySlot } from './fetch-available-slots'

export type FilterSlotsByOmniTimingInput = {
  scope: MedusaContainer
  zone: { location_id: string }
  lineItems: Array<{ variant_id: string; seller_id: string }>
  availableSlots: AvailableSlots
  hasOmni: boolean
  ziloSellerId: string | undefined
}

/**
 * Filter available slots by Omni location timing when cart has any Omni products (mixed or only-Omni).
 *
 * **Why:** When the cart contains Omni seller items (with or without Zilo), slotted delivery must
 * use the Omni store’s operating window (e.g. 11 AM–7 PM). We resolve the Omni location for the
 * first Omni line item via `prepareSlottedDeliveryLocation`, which:
 * - Finds the Omni location where that variant is available in the cluster.
 * - Returns `minSlotStartTime` = Omni location start time + 60 minutes (same rule as PDP).
 *
 * We then keep only zone slots whose start time is >= that minimum on the same date, so slots
 * align with the Omni store’s start/end. When cart has only Zilo, we return slots unchanged
 * (zone/cluster timing).
 *
 * @param input - scope, zone, lineItems, availableSlots, hasOmni, ziloSellerId
 * @returns Filtered availableSlots (today/tomorrow) when hasOmni and minSlotStartTime is set; otherwise original slots
 */
export async function filterSlotsByOmniTiming(input: FilterSlotsByOmniTimingInput): Promise<AvailableSlots> {
  const { scope, zone, lineItems, availableSlots, hasOmni, ziloSellerId } = input

  if (!hasOmni || !ziloSellerId) {
    return availableSlots
  }

  const firstOmniItem = lineItems.find((item) => item.seller_id !== ziloSellerId)
  if (!firstOmniItem?.variant_id || !firstOmniItem?.seller_id) {
    return availableSlots
  }

  try {
    const prepared = await prepareSlottedDeliveryLocation({
      scope,
      location_id: zone.location_id,
      variant_id: firstOmniItem.variant_id,
      seller_id: firstOmniItem.seller_id,
      now: new Date()
    })

    const minSlotStartTime = prepared.minSlotStartTime
    if (!minSlotStartTime) {
      return availableSlots
    }
    const maxSlotEndTime = prepared.maxSlotEndTime

    const now = new Date()
    const todayStr = getTodayIST(now)
    const tomorrowStr = getTomorrowIST(now)
    const minHour = minSlotStartTime.getHours()
    const minMinute = minSlotStartTime.getMinutes()
    const minTimeStr = `${String(minHour).padStart(2, '0')}:${String(minMinute).padStart(2, '0')}`

    const filterSlotsByMinStart = (slots: DeliverySlot[], slotDateStr: string): DeliverySlot[] =>
      slots.filter((slot) => {
        const startParsed = parseHHMM(slot.start_time)
        if (!startParsed) return true
        const slotStartStr = `${String(startParsed.h).padStart(2, '0')}:${String(startParsed.m).padStart(2, '0')}`
        const slotStartDateTime = createISTDateTime(slotDateStr, slotStartStr)
        const minSlotStartOnDate = createISTDateTime(slotDateStr, minTimeStr)
        if (slotStartDateTime < minSlotStartOnDate) {
          return false
        }

        // Also enforce omni closing boundary when available:
        // keep only slots ending on/before omni end_time.
        if (maxSlotEndTime) {
          const slotEndParsed = parseHHMM(slot.end_time)
          if (slotEndParsed) {
            const slotEndStr = `${String(slotEndParsed.h).padStart(2, '0')}:${String(slotEndParsed.m).padStart(2, '0')}`
            const omniEndStr = `${String(maxSlotEndTime.getHours()).padStart(2, '0')}:${String(maxSlotEndTime.getMinutes()).padStart(2, '0')}`
            const slotEndDateTime = createISTDateTime(slotDateStr, slotEndStr)
            const omniEndDateTime = createISTDateTime(slotDateStr, omniEndStr)
            if (slotEndDateTime > omniEndDateTime) {
              return false
            }
          }
        }

        return true
      })

    return {
      today: filterSlotsByMinStart(availableSlots.today, todayStr),
      tomorrow: filterSlotsByMinStart(availableSlots.tomorrow, tomorrowStr)
    }
  } catch {
    return availableSlots
  }
}
