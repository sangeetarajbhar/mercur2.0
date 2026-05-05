import { MedusaContainer } from '@medusajs/framework'
import { createISTDateTime, getTodayIST, getTomorrowIST, parseHHMM } from '../../utils/date-time-utils'
import type { AvailableSlots, DeliverySlot } from './fetch-available-slots'

export type FilterSlotsByOmniTimingInput = {
  scope: MedusaContainer
  zone: { location_id: string }
  lineItems: Array<{ variant_id: string; seller_id: string }>
  availableSlots: AvailableSlots
  slotWindow?: {
    minSlotStartTime: Date | null
    maxSlotEndTime: Date | null
  } | null
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
  const { availableSlots, hasOmni, slotWindow } = input

  if (!hasOmni) {
    return availableSlots
  }

  if (!slotWindow?.minSlotStartTime && !slotWindow?.maxSlotEndTime) {
    return availableSlots
  }

  try {
    const minSlotStartTime = slotWindow?.minSlotStartTime ?? null
    const maxSlotEndTime = slotWindow?.maxSlotEndTime ?? null

    const now = new Date()
    const todayStr = getTodayIST(now)
    const tomorrowStr = getTomorrowIST(now)
    const minTimeStr = minSlotStartTime
      ? `${String(minSlotStartTime.getHours()).padStart(2, '0')}:${String(minSlotStartTime.getMinutes()).padStart(2, '0')}`
      : null
    const omniEndStr = maxSlotEndTime
      ? `${String(maxSlotEndTime.getHours()).padStart(2, '0')}:${String(maxSlotEndTime.getMinutes()).padStart(2, '0')}`
      : null

    const filterSlotsByMinStart = (slots: DeliverySlot[], slotDateStr: string): DeliverySlot[] =>
      slots.filter((slot) => {
        if (minTimeStr) {
          const startParsed = parseHHMM(slot.start_time)
          if (startParsed) {
            const slotStartStr = `${String(startParsed.h).padStart(2, '0')}:${String(startParsed.m).padStart(2, '0')}`
            const slotStartDateTime = createISTDateTime(slotDateStr, slotStartStr)
            const minSlotStartOnDate = createISTDateTime(slotDateStr, minTimeStr)
            if (slotStartDateTime < minSlotStartOnDate) {
              return false
            }
          }
        }

        // Also enforce omni closing boundary when available:
        // keep only slots ending on/before omni end_time.
        if (omniEndStr) {
          const slotEndParsed = parseHHMM(slot.end_time)
          if (slotEndParsed) {
            const slotEndStr = `${String(slotEndParsed.h).padStart(2, '0')}:${String(slotEndParsed.m).padStart(2, '0')}`
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
