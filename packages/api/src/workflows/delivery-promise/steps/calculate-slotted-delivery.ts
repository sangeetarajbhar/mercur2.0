import { constructS3Url } from '../../../shared/utils/common'
import type { ControlSettings } from './fetch-control-settings'
import type { DeliveryPromiseResult } from './calculate-delivery-promise-from-zone'
import { parseHHMM, withTime, formatToHrTime, getTodayIST, getTomorrowIST, createISTDateTime } from '../utils/date-time-utils'
// import { SLOT_OVERRIDES_MODULE } from '../../../modules/slot-overrides'
// import type SlotOverrideModuleService from '../../../modules/slot-overrides/service'
// import type { MedusaContainer } from '@medusajs/framework'

// Fetch slot definitions
// async function fetchSlotDefinitions(query: any, zone_id: string): Promise<any[]> {
//   const { data: slotDefinitionsData } = await query.graph({
//     entity: 'slot_definition',
//     fields: ['*'],
//     filters: {
//       zone_id: zone_id,
//       is_active: true,
//       deleted_at: null
//     }
//   })

//   return (slotDefinitionsData || []).sort((a: any, b: any) =>
//     a.start_time.localeCompare(b.start_time)
//   )
// }

// Fetch slot overrides for today and tomorrow
async function fetchSlotOverrides(
  query: any,
  zone_id: string,
  todayStr: string,
  tomorrowStr: string
): Promise<any[]> {
  const { data: slotOverridesData } = await query.graph({
    entity: 'slot_override',
    fields: ['*'],
    filters: {
      zone_id: zone_id,
      slot_date: [todayStr, tomorrowStr],
      is_active: true,
      deleted_at: null
    }
  })

  return (slotOverridesData || []).sort((a: any, b: any) => {
    const dateCompare = a.slot_date.localeCompare(b.slot_date)
    if (dateCompare !== 0) return dateCompare
    return a.start_time.localeCompare(b.start_time)
  })
}

// Find first available slot
function findAvailableSlot(
  slotOverrides: any[],
  // cutoffMap: Map<string, string>,
  now: Date,
  todayStr: string,
  tomorrowStr: string,
  minSlotStartTime?: Date | null,
  maxSlotEndTime?: Date | null
): any | null {
  for (const slot of slotOverrides) {
    const slotMeta = {
      slot_date: slot.slot_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      remaining_capacity: slot.remaining_capacity,
      cut_off_time: slot.cut_off_time ?? null,
    }

    // Always check capacity first
    if (slot.remaining_capacity <= 0) {
      // console.log('[SLOTTED_DEBUG] rejected_capacity', slotMeta)
      continue
    }

    // Parse slot start time to check against minimum slot start time
    const slotStartParsed = parseHHMM(slot.start_time)
    if (slotStartParsed && minSlotStartTime) {
      const slotStartTimeStr = `${String(slotStartParsed.h).padStart(2, '0')}:${String(slotStartParsed.m).padStart(2, '0')}`
      const slotStartDateTime = createISTDateTime(slot.slot_date, slotStartTimeStr)

      // Extract time (hours and minutes) from minSlotStartTime and apply it to the slot's date
      const minHour = minSlotStartTime.getHours()
      const minMinute = minSlotStartTime.getMinutes()
      const minSlotStartTimeOnSlotDate = createISTDateTime(slot.slot_date, `${String(minHour).padStart(2, '0')}:${String(minMinute).padStart(2, '0')}`)

      // Skip slots that start before the minimum required time (on the same date as the slot)
      if (slotStartDateTime < minSlotStartTimeOnSlotDate) {
        // console.log('[SLOTTED_DEBUG] rejected_min_start', {
        //   ...slotMeta,
        //   min_slot_start: minSlotStartTimeOnSlotDate.toISOString(),
        //   slot_start: slotStartDateTime.toISOString(),
        // })
        continue
      }
    }

    // Enforce omni/location closing boundary when provided:
    // keep only slots that end on or before maxSlotEndTime.
    const slotEndParsedForBoundary = parseHHMM(slot.end_time)
    if (maxSlotEndTime && slotEndParsedForBoundary) {
      const slotEndTimeStr = `${String(slotEndParsedForBoundary.h).padStart(2, '0')}:${String(slotEndParsedForBoundary.m).padStart(2, '0')}`
      const maxEndTimeStr = `${String(maxSlotEndTime.getHours()).padStart(2, '0')}:${String(maxSlotEndTime.getMinutes()).padStart(2, '0')}`
      const slotEndDateTime = createISTDateTime(slot.slot_date, slotEndTimeStr)
      const maxEndDateTime = createISTDateTime(slot.slot_date, maxEndTimeStr)
      if (slotEndDateTime > maxEndDateTime) {
        // console.log('[SLOTTED_DEBUG] rejected_max_end', {
        //   ...slotMeta,
        //   max_slot_end: maxEndDateTime.toISOString(),
        //   slot_end: slotEndDateTime.toISOString(),
        // })
        continue
      }
    }

    // For tomorrow's slots: only check capacity, ignore cutoff time
    if (slot.slot_date === tomorrowStr) {
      // console.log('[SLOTTED_DEBUG] accepted_tomorrow', slotMeta)
      return slot
    }

    // For today's slots: check both cutoff time AND slot end time hasn't passed
    if (slot.slot_date === todayStr) {
      // Check if slot end time has already passed (in IST)
      // Use createISTDateTime to properly create time in IST context
      const slotEndParsed = parseHHMM(slot.end_time)
      if (slotEndParsed) {
        const slotEndTimeStr = `${String(slotEndParsed.h).padStart(2, '0')}:${String(slotEndParsed.m).padStart(2, '0')}`
        const slotEndToday = createISTDateTime(todayStr, slotEndTimeStr)

        if (now >= slotEndToday) {
          // console.log('[SLOTTED_DEBUG] rejected_today_ended', {
          //   ...slotMeta,
          //   now: now.toISOString(),
          //   slot_end_today: slotEndToday.toISOString(),
          // })
          continue // Slot has already ended
        }
      }

      const cutoffTime = slot.cut_off_time;
      if (!cutoffTime) {
        // console.log('[SLOTTED_DEBUG] rejected_missing_cutoff', slotMeta)

        continue
      }

      const cutoffParsed = parseHHMM(cutoffTime)
      if (!cutoffParsed) {
        // console.log('[SLOTTED_DEBUG] rejected_invalid_cutoff', slotMeta)

        continue
      }

      const cutoffTimeStr = `${String(cutoffParsed.h).padStart(2, '0')}:${String(cutoffParsed.m).padStart(2, '0')}`
      const cutoffToday = createISTDateTime(todayStr, cutoffTimeStr)
      const beforeCutoff = now < cutoffToday

      if (beforeCutoff) {
        // console.log('[SLOTTED_DEBUG] accepted_today', {
        //   ...slotMeta,
        //   cutoff_today: cutoffToday.toISOString(),
        //   now: now.toISOString(),
        // })
        return slot
      }

      // console.log('[SLOTTED_DEBUG] rejected_cutoff_passed', {
      //   ...slotMeta,
      //   cutoff_today: cutoffToday.toISOString(),
      //   now: now.toISOString(),
      // })
    }
  }

  // console.log('[SLOTTED_DEBUG] no_slot_available_after_filters', {
  //   total_slots_evaluated: slotOverrides.length,
  //   today: todayStr,
  //   tomorrow: tomorrowStr,
  //   min_slot_start: minSlotStartTime?.toISOString() ?? null,
  //   max_slot_end:
  //     maxSlotEndTime
  //       ? `${String(maxSlotEndTime.getHours()).padStart(2, '0')}:${String(maxSlotEndTime.getMinutes()).padStart(2, '0')}`
  //       : null,
  // })

  return null
}

// Calculate slotted delivery promise
export async function calculateSlottedDelivery(
  query: any,
  zone_id: string,
  location_id: string,
  now: Date,
  controlSettings: ControlSettings,
  minSlotStartTime?: Date | null,
  maxSlotEndTime?: Date | null
  // scope: MedusaContainer
): Promise<DeliveryPromiseResult | null> {
  // Server is already in IST, use current time directly
  const todayStr = getTodayIST(now)
  const tomorrowStr = getTomorrowIST(now)

  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  const slotOverrides = await fetchSlotOverrides(query, zone_id, todayStr, tomorrowStr)

  if (!slotOverrides || slotOverrides.length === 0) {
    return null
  }

  const availableSlot = findAvailableSlot(
    slotOverrides,
    now,
    todayStr,
    tomorrowStr,
    minSlotStartTime,
    maxSlotEndTime
  )

  if (!availableSlot) {
    return null
  }

  const slotStart = parseHHMM(availableSlot.start_time)
  const slotEnd = parseHHMM(availableSlot.end_time)

  if (!slotStart || !slotEnd) {
    return null
  }

  const slotDate = availableSlot.slot_date === todayStr ? now : tomorrow
  const slotStartTime = withTime(slotDate, slotStart.h, slotStart.m)
  const slotEndTime = withTime(slotDate, slotEnd.h, slotEnd.m)

  const minutesUntilSlot = Math.max(0, Math.round((slotStartTime.getTime() - now.getTime()) / 60000))

  const isToday = availableSlot.slot_date === todayStr
  const message = isToday
    ? `Delivery Today  ${formatToHrTime(slotStartTime)} - ${formatToHrTime(slotEndTime)}`
    : `Delivery Tomorrow  ${formatToHrTime(slotStartTime)} - ${formatToHrTime(slotEndTime)}`

  let delay = false;
  let delayMessage: string | null = null;

  if (controlSettings.delayMinutes > 0) {
    delay = true;
    delayMessage = `${controlSettings.delayMessage}`
  }

  void minutesUntilSlot

  return {
    status: true,
    location_id: location_id,
    eta_iso: slotStartTime.toISOString(),
    message,
    delay,
    delay_message: delayMessage,
    message_icon: controlSettings.messageIcon ? constructS3Url(controlSettings.messageIcon) : null,
    delivery_type: 'slotted',
    delivery_date: availableSlot.slot_date
  }
}

