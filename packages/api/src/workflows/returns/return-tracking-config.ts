/**
 * Return tracking timeline — same idea as `api/store/orders/utils.ts` `timelineConfig` + `buildOrderTimeline`.
 * Steps order and `status` / `label` values are stable for the storefront.
 */

import { formatDateTimeDisplay } from '../../shared/utils/date-utils'

export type ReturnTrackingBuildContext = {
  ret: Record<string, any>
  ext?: Record<string, any> | null
  refundAt: Date | null
}

export type ReturnTrackingTimelineItem = {
  status: string
  label: string
  date: string | null
  completed: boolean
  index: number
}

type ConfigEntry = {
  status: string
  label: string
  resolve: (ctx: ReturnTrackingBuildContext) => {
    raw: string | Date | null | undefined
    completed: boolean
  }
}

/** Normal return: fixed order expected by the client */
const activeReturnTrackingConfig: ConfigEntry[] = [
  {
    status: 'return_requested',
    label: 'Return Requested',
    resolve: ({ ret }) => ({
      raw: ret.created_at,
      completed: !!ret.created_at,
    }),
  },
  {
    status: 'rider_out_for_pickup',
    label: 'Rider Out for Pickup',
    resolve: ({ ext }) => ({
      raw: ext?.out_for_pickup_at,
      completed: !!ext?.out_for_pickup_at,
    }),
  },
  {
    status: 'returned_picked',
    label: 'Returned Picked',
    resolve: ({ ret }) => {
      const done = !!ret.received_at
      return {
        raw: done ? ret.received_at : null,
        completed: done,
      }
    },
  },
  {
    status: 'refund_initiated',
    label: 'Refund Initiated',
    resolve: ({ refundAt }) => ({
      raw: refundAt ?? null,
      completed: !!refundAt,
    }),
  },
]

/** Canceled return: Return Requested → Return Canceled (client historical shape) */
const canceledReturnTrackingConfig: ConfigEntry[] = [
  {
    status: 'return_requested',
    label: 'Return Requested',
    resolve: ({ ret }) => ({
      raw: ret.created_at,
      completed: !!ret.created_at,
    }),
  },
  {
    status: 'return_canceled',
    label: 'Return Canceled',
    resolve: ({ ret }) => ({
      raw: ret.canceled_at,
      completed: true,
    }),
  },
]

/**
 * Builds `track` for GET /store/returns/:id/tracking — same item shape as before.
 */
export function buildReturnTrackingTimeline(
  ctx: ReturnTrackingBuildContext
): ReturnTrackingTimelineItem[] {
  const config =
    ctx.ret.status === 'canceled'
      ? canceledReturnTrackingConfig
      : activeReturnTrackingConfig

  return config.map((entry, i) => {
    const { raw, completed } = entry.resolve(ctx)
    return {
      status: entry.status,
      label: entry.label,
      date: completed ? formatDateTimeDisplay(raw) : null,
      completed,
      index: i + 1,
    }
  })
}
