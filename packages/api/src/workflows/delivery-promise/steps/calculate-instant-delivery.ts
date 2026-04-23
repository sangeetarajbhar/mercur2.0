import { constructS3Url } from '../../../shared/utils/common'
import type { ControlSettings } from './fetch-control-settings'
import type { LocationTiming } from '../../../modules/zone/utils/location-timing'
import type { DeliveryPromiseResult } from './calculate-delivery-promise-from-zone'
import { parseHHMM, addMinutes, getTodayIST } from '../utils/date-time-utils'
import { CacheTTLMap, QueryGraphCacheKey } from '../../../shared/utils/redisKey'
import { CACHE_ENABLE } from '../../../shared/utils/redisKey'

const PROMISE_TEXT_PLACEHOLDER = '{{PROMISE_MINUTES}}'

export type EffectiveInstantPromise = {
  promiseMinutes: number
  displayMinutes: number
  netPromiseMinutes: number
  promiseText: string | null
}

export async function getEffectiveInstantPromise(
  query: any,
  zone_id: string,
  controlSettings: ControlSettings,
  seller_id: string,
  omniExtraPromiseMinutes = 0
): Promise<EffectiveInstantPromise | null> {
  const { data: [instantPromises] } = await query.graph({
      entity: 'instant_promise',
      fields: ['id', 'promise_minutes', 'return_lead_minutes', 'promise_text'],
      filters: {
        zone_id: zone_id,
        is_active: true,
        deleted_at: null
      }
    },
    {
      cache: {
        enable: CACHE_ENABLE,
        ttl: CacheTTLMap[QueryGraphCacheKey.FETCH_INSTANT_PROMISES],
        key: QueryGraphCacheKey.FETCH_INSTANT_PROMISES + `${zone_id}`,
      },
    }
  )

  if (!instantPromises) {
    return null
  }

  let promiseMinutes =
    (instantPromises.promise_minutes || 0) +
    (instantPromises.return_lead_minutes || 0) +
    (controlSettings.delayMinutes || 0)

  let netPromiseMinutes = (instantPromises.promise_minutes || 0) +
  (controlSettings.delayMinutes || 0)

  let displayMinutes =
    (instantPromises.promise_minutes || 0) +
    (controlSettings.delayMinutes || 0)

  if (seller_id && seller_id !== process.env.ZILO_SELLER_ID) {
    promiseMinutes += omniExtraPromiseMinutes
    displayMinutes += omniExtraPromiseMinutes
    netPromiseMinutes += omniExtraPromiseMinutes
  }

  return {
    promiseMinutes,
    displayMinutes,
    netPromiseMinutes,
    promiseText: instantPromises.promise_text || null

  }
}

// Calculate instant delivery promise
export async function calculateInstantDelivery(
  promiseConfig: EffectiveInstantPromise,
  locationHours: LocationTiming,
  now: Date,
  controlSettings: ControlSettings,
  location_id: string,
): Promise<DeliveryPromiseResult | null> {
  // const promiseConfig =
  //   effectiveInstantPromise ??
  //   await getEffectiveInstantPromise(
  //     query,
  //     zone_id,
  //     controlSettings,
  //     seller_id,
  //     omniExtraPromiseMinutes
  //   )

  // if (!promiseConfig) {
  //   return null
  // }

  const { promiseMinutes, displayMinutes, promiseText } = promiseConfig

  const locationStart = parseHHMM(locationHours.start_time)
  const locationEnd = parseHHMM(locationHours.end_time)

  const eta = addMinutes(now, promiseMinutes)

  const todayStr = now.toISOString().split('T')[0]
  const etaDateStr = eta.toISOString().split('T')[0]

  const baseMessage = promiseText || `Delivery in ${displayMinutes} minutes`
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
