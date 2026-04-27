import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { PayoutTransactionsStatus } from '../modules/payout-transactions/types/mutations'
import { fetchPayoutById } from '../modules/customer_refund_methods/utils/razorpay-validation'


/**
 * Scheduled job to verify Razorpay payout status for payout_transactions in "processing" state.
 *
 * Fallback mechanism for webhook failures. Checks payout_transactions that are still in
 * "processing" status and verifies actual payout status with Razorpay Fetch Payout by ID API.
 *
 * Configuration (via .env):
 * - PAYOUT_CRON_JOB_VERIFY_SCHEDULE: Cron schedule (default: every 30 minutes)
 */

const CONFIG = {
  SCHEDULE: process.env.PAYOUT_CRON_JOB_VERIFY_SCHEDULE || '*/30 * * * *',
}

const LOG_PREFIX = '[PAYOUT_UPDATE_STATUS]'

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type PayoutTransactionRow = {
  id: string
  created_at: string | Date // for cursor pagination
  provider_payout_id: string
  status: string | null // model.text().nullable()
  utr: string | null
  fees: number | string | null // bigNumber can return string
  tax: number | string | null
  status_details?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

type RazorpayPayoutStatusDetails = {
  description?: string
  source?: string
  reason?: string
}

type RazorpayPayoutEntity = {
  id: string
  status: string
  utr: string | null
  fees: number
  tax: number
  status_details?: RazorpayPayoutStatusDetails | null
  [key: string]: unknown
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Cursor (keyset) pagination to avoid skipping rows when status is updated.
 * Using OFFSET would skip records: after updating processing → processed, those rows
 * leave the result set, so the next OFFSET batch would miss rows that moved "forward".
 * Cursor uses (created_at, id) so the next batch is stable regardless of status changes.
 */
const fetchProcessingPayoutsBatch = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Knex from PG_CONNECTION
  knex: any,
  limit: number,
  cursor: { created_at: string | Date; id: string } | null
): Promise<PayoutTransactionRow[]> => {
  const q = knex('payout_transactions')
    .select(
      'id',
      'created_at',
      'provider_payout_id',
      'status',
      'utr',
      'fees',
      'tax',
      'status_details',
      'metadata'
    )
    .whereNull('deleted_at')
    .where('status', PayoutTransactionsStatus.PROCESSING)
    .orderBy('created_at', 'asc')
    .orderBy('id', 'asc')
    .limit(limit)

  if (cursor) {
    q.whereRaw('(created_at, id) > (?, ?)', [cursor.created_at, cursor.id])
  }

  return q
}

// ----------------------------------------------------------------------------
// Main Job
// ----------------------------------------------------------------------------

export default async function updateRazorpayPayoutStatusJob(container: MedusaContainer) {

  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  logger.info(`${LOG_PREFIX} Razorpay payout update status job started...`)

  try {
    const limit = 30
    let cursor: { created_at: string | Date; id: string } | null = null
    let hasMore = true

    while (hasMore) {
      const payouts: PayoutTransactionRow[] = await fetchProcessingPayoutsBatch(
        knex,
        limit,
        cursor
      )

      if (!payouts.length) {
        hasMore = false
        break
      }

      for (const payoutRow of payouts) {
        if (!payoutRow?.provider_payout_id?.trim()) {
          continue
        }

        try {
          const payout = (await fetchPayoutById(
            payoutRow.provider_payout_id
          )) as RazorpayPayoutEntity

          const razorpayStatus = payout?.status

          if (!razorpayStatus) {
            continue
          }

          const currentStatus = (payoutRow.status ?? '').toLowerCase()
          const newStatus = razorpayStatus.toLowerCase()

          const shouldUpdate = currentStatus !== newStatus

          if (!shouldUpdate) {
            continue
          }

          const now = new Date().toISOString()

          const existingMetadata = (payoutRow.metadata || {}) as Record<string, unknown>

          const metadata: Record<string, unknown> = {
            ...existingMetadata,
            /** Set when status is updated by the payout verify cron job (verify-razorpay-payout-status). */
            status_updated_by_payout_update_status_cron: {
              at: now,
              previous_status: payoutRow.status,
              new_status: razorpayStatus,
              job: 'razorpay-payout-update-status-cron',
            },
          }

          const updateData: Record<string, unknown> = {
            status: razorpayStatus,
            status_details: payout.status_details ?? null,
            utr: payout.utr ?? payoutRow.utr ?? null,
            fees: payout.fees ?? payoutRow.fees ?? null,
            tax: payout.tax ?? payoutRow.tax ?? null,
            response_snapshot: payout,
            metadata,
            updated_at: now,
          }

          const updatedCount = await knex('payout_transactions')
            .where('id', payoutRow.id)
            .where('status', PayoutTransactionsStatus.PROCESSING)
            .whereNull('deleted_at')
            .update(updateData)

          if (Number(updatedCount) > 0) {
            logger.info(
              `${LOG_PREFIX} id=${payoutRow.id}, payout_id=${payoutRow.provider_payout_id} ${currentStatus} → ${newStatus}`
            )
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          logger.error(
            `${LOG_PREFIX} Failed to sync payout id=${payoutRow.id} provider_payout_id=${payoutRow.provider_payout_id} error=${message}`
          )
        }
      }

      const last = payouts[payouts.length - 1]
      cursor = { created_at: last.created_at, id: last.id }
      hasMore = payouts.length >= limit
    }

    logger.info(`${LOG_PREFIX} Razorpay payout verification job finished`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error(`${LOG_PREFIX} Update Razorpay payout status Job failed: ${message}`)
  }
}

export const config = {
  name: 'verify-razorpay-payout-status',
  schedule: CONFIG.SCHEDULE,
}
