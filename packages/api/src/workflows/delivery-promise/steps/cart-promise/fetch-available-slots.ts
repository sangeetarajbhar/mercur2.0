import { parseHHMM, withTime, formatToHrTime, getTodayIST, getTomorrowIST, createISTDateTime } from '../../utils/date-time-utils'
import type { ControlSettings } from '../fetch-control-settings'
// import { SLOT_OVERRIDES_MODULE } from '../../../../modules/slot-overrides'
// import type SlotOverrideModuleService from '../../../../modules/slot-overrides/service'
// import type { MedusaContainer } from '@medusajs/framework'

export type DeliverySlot = {
  slot_id: string
  slot_key: string
  start_time: string
  end_time: string
  formatted_time_range: string
}

export type AvailableSlots = {
  today: DeliverySlot[]
  tomorrow: DeliverySlot[]
}

/**
 * Fetches available delivery slots grouped by today and tomorrow
 * Creates slot overrides from definitions if they don't exist
 * @param zone_id - Zone ID
 * @param location_id - Location ID
 * @param query - Query service
 * @param controlSettings - Control settings for zone/location
 * @param scope - Container for resolving services
 * @returns Available slots grouped as { today: [], tomorrow: [] }
 */
export async function fetchAvailableSlots(
  zone_id: string,
  // location_id: string,
  query: any,
  controlSettings: ControlSettings,
  // scope: MedusaContainer
): Promise<AvailableSlots> {
  const now = new Date()

  // Check if slotted delivery is enabled
  if (!controlSettings.isSlottedEnabled) {
    return { today: [], tomorrow: [] }
  }

  // Server is already in IST, use current time directly
  const todayStr = getTodayIST(now)
  const tomorrowStr = getTomorrowIST(now)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  // Fetch slot overrides
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

  const slotOverrides = (slotOverridesData || []).sort((a: any, b: any) => {
    const dateCompare = a.slot_date.localeCompare(b.slot_date)
    if (dateCompare !== 0) return dateCompare
    return a.start_time.localeCompare(b.start_time)
  })

  // Process slots and group by today/tomorrow
  const todaySlots: DeliverySlot[] = []
  const tomorrowSlots: DeliverySlot[] = []

  if (slotOverrides.length > 0) {
    for (const slot of slotOverrides) {
      // Always check capacity first
      if (slot.remaining_capacity <= 0) {
        continue
      }

      const isToday = slot.slot_date === todayStr
      let isAvailable = false

      // For tomorrow's slots: only check capacity, ignore cutoff time
      if (slot.slot_date === tomorrowStr) {
        isAvailable = true
      }
      // For today's slots: check cutoff time and slot end time
      else if (slot.slot_date === todayStr) {
        // Check if slot end time has already passed (in IST)
        // Use createISTDateTime to properly create time in IST context
        const slotEndParsed = parseHHMM(slot.end_time)
        if (slotEndParsed) {
          const slotEndTimeStr = `${String(slotEndParsed.h).padStart(2, '0')}:${String(slotEndParsed.m).padStart(2, '0')}`
          const slotEndToday = createISTDateTime(todayStr, slotEndTimeStr)

          if (now >= slotEndToday) {
            continue // Slot has already ended
          }
        }

        // Try multiple sources for cutoff time:
        // 1. From slot_override.cut_off_time (if populated)
        // 2. From cutoffMap using slot_key (from slot_definition)
        const cutoffTime = slot.cut_off_time || '00:00';

        // If cutoff time exists, validate it
        if (cutoffTime) {
          const cutoffParsed = parseHHMM(cutoffTime)
          if (cutoffParsed) {
            const cutoffTimeStr = `${String(cutoffParsed.h).padStart(2, '0')}:${String(cutoffParsed.m).padStart(2, '0')}`
            const cutoffToday = createISTDateTime(todayStr, cutoffTimeStr)

            // Only show if cutoff time has not passed
            if (now < cutoffToday) {
              isAvailable = true
            }
          } else {
            // Invalid cutoff format, skip this slot
            continue
          }
        } else {
          // No cutoff time configured, slot is available for today
          isAvailable = true
        }
      }

      // Only include available slots in the result
      if (!isAvailable) {
        continue
      }

      // Format time range
      const slotStart = parseHHMM(slot.start_time)
      const slotEnd = parseHHMM(slot.end_time)

      let formattedTimeRange = `${slot.start_time} - ${slot.end_time}`
      if (slotStart && slotEnd) {
        const slotDate = isToday ? now : tomorrow
        const slotStartTime = withTime(slotDate, slotStart.h, slotStart.m)
        const slotEndTime = withTime(slotDate, slotEnd.h, slotEnd.m)
        formattedTimeRange = `${formatToHrTime(slotStartTime)} - ${formatToHrTime(slotEndTime)} `
      }

      const slotData: DeliverySlot = {
        slot_id: slot.id,
        slot_key: slot.slot_key,
        start_time: slot.start_time,
        end_time: slot.end_time,
        formatted_time_range: formattedTimeRange
      }

      // Group by today or tomorrow
      if (isToday) {
        todaySlots.push(slotData)
      } else {
        tomorrowSlots.push(slotData)
      }
    }
  }
  return {
    today: todaySlots,
    tomorrow: tomorrowSlots
  }
}

