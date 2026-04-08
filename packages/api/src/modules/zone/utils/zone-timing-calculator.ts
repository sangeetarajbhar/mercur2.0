import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { fetchLocationTiming } from "./location-timing"

export interface ZoneTiming {
  start_time: string | null
  end_time: string | null
  effective_end_time: string | null
}

export interface InstantPromise {
  id: string
  promise_minutes: number
  return_lead_minutes: number
  is_active: boolean
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const timeParts = timeStr.split(":")
  const hours = parseInt(timeParts[0], 10)
  const minutes = parseInt(timeParts[1], 10)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  if (minutes < 0) minutes = 0
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

export async function calculateZoneTiming(
  scope: { resolve: (key: string) => unknown },
  locationId: string,
  zoneId?: string
): Promise<ZoneTiming> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as any
  const locationTiming = await fetchLocationTiming(scope, locationId)

  let effectiveStartTime = locationTiming.start_time
  let effectiveEndTime = locationTiming.end_time

  if (zoneId && locationTiming.start_time && locationTiming.end_time) {
    try {
      const { data: instantPromises } = await query.graph({
        entity: "instant_promise",
        fields: ["id", "promise_minutes", "return_lead_minutes", "is_active"],
        filters: {
          zone_id: zoneId,
          is_active: true,
        },
      })

      if (instantPromises && instantPromises.length > 0) {
        const promise = instantPromises[0] as InstantPromise
        const startTimeMinutes = timeToMinutes(locationTiming.start_time)
        const effectiveStartTimeMinutes = startTimeMinutes + promise.promise_minutes
        effectiveStartTime = minutesToTime(effectiveStartTimeMinutes)

        const totalMinutesToSubtract = promise.promise_minutes + promise.return_lead_minutes
        const endTimeMinutes = timeToMinutes(locationTiming.end_time)
        const effectiveEndTimeMinutes = endTimeMinutes - totalMinutesToSubtract
        effectiveEndTime = minutesToTime(effectiveEndTimeMinutes)
      }
    } catch (error) {
      console.warn("Failed to fetch instant promises for zone timing calculation:", error)
    }
  }

  return {
    start_time: effectiveStartTime,
    end_time: locationTiming.end_time,
    effective_end_time: effectiveEndTime,
  }
}
