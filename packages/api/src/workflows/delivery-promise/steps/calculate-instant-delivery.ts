import { constructS3Url } from '../../../shared/utils/common'
import type { ControlSettings } from './fetch-control-settings'
import type { LocationOperatingHours } from './fetch-location-hours'
import type { DeliveryPromiseResult } from './calculate-delivery-promise-from-zone'
import { parseHHMM, addMinutes, getTodayIST } from '../utils/date-time-utils'

const PROMISE_TEXT_PLACEHOLDER = '{{PROMISE_MINUTES}}'

// Calculate instant delivery promise
export async function calculateInstantDelivery(
  query: any,
  zone_id: string,
  location_id: string,
  now: Date,
  controlSettings: ControlSettings,
  locationHours: LocationOperatingHours,
  seller_id: string
): Promise<DeliveryPromiseResult | null> {
  const { data: instantPromisesData } = await query.graph({
    entity: 'instant_promise',
    fields: ['*'],
    filters: {
      zone_id: zone_id,
      is_active: true,
      deleted_at: null
    }
  })

  const sortedInstantPromises = (instantPromisesData || []).sort((a: any, b: any) =>
    a.promise_minutes - b.promise_minutes
  )
  const instantPromises = sortedInstantPromises[0] || null


  if (!instantPromises) {
    return null
  }

  let promiseMinutes = (instantPromises.promise_minutes || 0) + (instantPromises.return_lead_minutes || 0) + (controlSettings.delayMinutes || 0)

  const locationStart = parseHHMM(locationHours.startTime)
  const locationEnd = parseHHMM(locationHours.endTime)

  if (seller_id && seller_id !== process.env.ZILO_SELLER_ID) {
    promiseMinutes = promiseMinutes + parseInt(process.env.OMNI_SELLER_EXTRA_MINUTES || '0')
  }

  const eta = addMinutes(now, promiseMinutes)

  const todayStr = now.toISOString().split('T')[0]
  const etaDateStr = eta.toISOString().split('T')[0]
  let displayMinutes = (instantPromises.promise_minutes || 0) + (controlSettings.delayMinutes || 0)

  if (seller_id && seller_id !== process.env.ZILO_SELLER_ID) {
    displayMinutes = displayMinutes + parseInt(process.env.OMNI_SELLER_EXTRA_MINUTES || '0')
  }

  const baseMessage = instantPromises.promise_text || `Delivery in ${displayMinutes} minutes`
  const message = baseMessage.includes(PROMISE_TEXT_PLACEHOLDER)
    ? baseMessage.replace(new RegExp(PROMISE_TEXT_PLACEHOLDER, 'g'), `${displayMinutes}`)
    : baseMessage
  let delay = false;
  let delayMessage: string | null = null;

  // CRITICAL CHECK: If ETA crosses to tomorrow, don't show instant delivery
  // Example: Current: 11:30 PM, promise_minutes: 120, ETA: 1:30 AM tomorrow
  // In this case, show slotted delivery (tomorrow's slot) instead
  if (etaDateStr !== todayStr) {
    return null
  }

  // Check if instant delivery is possible today
  // Instant delivery should only show if it can be delivered TODAY
  // The total promiseMinutes (including return_lead_minutes) must complete before store closing time
  if (locationStart && locationEnd) {
    // Server is already in IST, create dates directly using today's date and time
    const todayDateStr = getTodayIST(now)
    const [year, month, day] = todayDateStr.split('-').map(Number)

    const startToday = new Date(year, month - 1, day, locationStart.h, locationStart.m, 0, 0)
    const endToday = new Date(year, month - 1, day, locationEnd.h, locationEnd.m, 0, 0)

    if (now < startToday || now >= endToday || eta > endToday) {
      return null
    }
  }

  if (controlSettings.delayMinutes > 0) {
    delay = true;
    delayMessage = `${controlSettings.delayMessage}`
  }

  return {
    status: true,
    location_id: location_id,
    eta_iso: eta.toISOString(),
    message,
    delay,
    delay_message: (delay) ? delayMessage : null,
    message_icon: (delay) ? controlSettings.messageIcon ? constructS3Url(controlSettings.messageIcon) : null : null,
    delivery_type: 'instant',
    delivery_date: etaDateStr,
    delivery_minutes: displayMinutes
  }
}
