import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { fetchZoneByPincode, fetchZoneIdByLocationId } from '../../../../../workflows/delivery-promise/steps/cart-promise/fetch-zone-by-pincode'


/**
 * Build PLP-specific promise message without affecting other apis
 */
export function buildPlpPromiseMessage(promise: {
  delivery_type?: 'instant' | 'slotted' | null
  delivery_minutes?: number | null
  message?: string
  slot_date?: string
} | undefined | null): string | null {
  if (!promise || !promise.delivery_type) {
    return null
  }

  const { delivery_type, delivery_minutes, message, slot_date } = promise

  // Helper to normalize a date to start-of-day for comparison
  const toStartOfDay = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const now = new Date()
  const today = toStartOfDay(now)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const deliveryDate =
    slot_date && !Number.isNaN(Date.parse(slot_date))
      ? toStartOfDay(new Date(slot_date))
      : null

  const isToday = deliveryDate && deliveryDate.getTime() === today.getTime()
  const isTomorrow =
    deliveryDate && deliveryDate.getTime() === tomorrow.getTime()

  // Instant delivery: always show "<minutes> mins"
  if (delivery_type === 'instant') {
    if (typeof delivery_minutes === 'number' && delivery_minutes > 0) {
      return `${delivery_minutes} mins`
    }
    return null
  }

  if (delivery_type === 'slotted') {
    if (typeof message !== 'string' || message.length === 0) {
      return null
    }
    // Tomorrow's slot: "Delivery Tomorrow  7 PM - 10 PM" → "Tom, 7 PM - 10 PM"
    if (isTomorrow) {
      return message.replace(/Delivery\s+Tomorrow\s*/i, 'Tom ')
    }
    // Today's slot: "Delivery Today  7 PM - 10 PM" → "7 PM - 10 PM"
    if (isToday) {
      return message.replace(/(?:Delivery\s+)?Today\s*,?\s*/i, '').trim()
    }
    // Other dates: reuse backend message as-is
    return message
  }

  return null
}

/**
 * Resolve zone_id and cluster_id for delivery promise calculation
 * Prefers pincode (same as home/cart), else falls back to location
 * 
 * @returns Object with zone_id and cluster_id, or null values if resolution fails
 */
export async function resolveZoneForPromise({
  scope,
  pincode,
  location
}: {
  scope: MedusaContainer
  pincode?: string | null
  location?: string | null
}): Promise<{
  zone_id: string | null
  cluster_id: string | null
}> {
  let zone_id: string | null = null
  let cluster_id: string | null = null

  // Priority 1: Use pincode to resolve zone (preferred method)
  if (pincode?.trim()) {
    const knex = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
    const zone = await fetchZoneByPincode(pincode.trim(), knex)
    if (zone) {
      zone_id = zone.id
      cluster_id = zone.location_id
    }
  }

  // Priority 2: Fall back to location if pincode resolution failed
  if (!zone_id || !cluster_id) {
    if (location) {
      zone_id = await fetchZoneIdByLocationId(location, scope)
      cluster_id = zone_id ? location : null
    }
  }

  return { zone_id, cluster_id }
}
