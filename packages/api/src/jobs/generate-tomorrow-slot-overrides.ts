import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { getTomorrowIST } from '../workflows/delivery-promise/utils/date-time-utils'
import { generateTomorrowSlotOverrides } from '../workflows/delivery-promise/utils/generate-tomorrow-slot-overrides'

const SLOT_OVERRIDES_LOCK_KEY = 'generate-tomorrow-slot-overrides'
const LOCK_TIMEOUT_SEC = 15

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL_SLOT_OVERRIDES

async function sendSlackNotification(text: string, logger: { warn: (msg: string, err?: unknown) => void }) {
  if (!SLACK_WEBHOOK_URL?.trim()) return
  try {
    const res = await fetch(SLACK_WEBHOOK_URL.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    if (!res.ok) {
      logger.warn(`[SLOT_OVERRIDES_CRON] Slack webhook returned ${res.status}`)
    }
  } catch (err) {
    logger.warn('[SLOT_OVERRIDES_CRON] Failed to send Slack notification', err)
  }
}

/**
 * Scheduled job to generate slot overrides for tomorrow.
 * Runs daily at 12:01 AM IST.
 *
 * Uses Medusa Locking Module execute(): only one process runs at a time (lock released when job finishes).
 * Processes that cannot acquire the lock within timeout skip and do not send Slack.
 */
export default async function generateTomorrowSlotOverridesJob(container: MedusaContainer) {
  const cronEnabled =
    process.env.CRON_ENABLED_SLOT_OVERRIDES === '1' ||
    process.env.CRON_ENABLED_SLOT_OVERRIDES === 'true' ||
    process.env.CRON_ENABLED_SLOT_OVERRIDES === 'TRUE'
  if (!cronEnabled) {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const lockingService = container.resolve(Modules.LOCKING)
  const now = new Date()
  const tomorrowStr = getTomorrowIST(now)

  try {
    await lockingService.execute(
      SLOT_OVERRIDES_LOCK_KEY,
      async () => {
        logger.info(`[SLOT_OVERRIDES_CRON] Starting job execution to generate slot overrides for tomorrow: ${tomorrowStr}`)
        const result = await generateTomorrowSlotOverrides(container)
        const errorsPart = result.totalErrors > 0 ? `, Errors: ${result.totalErrors}` : ''
        logger.info(
          `[SLOT_OVERRIDES_CRON] Job completed. Created: ${result.totalCreated}, Skipped: ${result.totalSkipped}${errorsPart}`
        )
        const message =
          `Slot overrides job completed. Date: ${tomorrowStr}. Created: ${result.totalCreated}, Skipped: ${result.totalSkipped}` +
          (result.totalErrors > 0 ? `, Errors: ${result.totalErrors}` : '')
        await sendSlackNotification(message, logger)
        return result
      },
      { timeout: LOCK_TIMEOUT_SEC }
    )
  } catch (error) {
    const isLockTimeout =
      error instanceof Error &&
      (error.message?.toLowerCase().includes('timed-out') || error.message?.toLowerCase().includes('timeout'))
    if (isLockTimeout) {
      logger.info(
        `[SLOT_OVERRIDES_CRON] Skipping: could not acquire lock within ${LOCK_TIMEOUT_SEC}s (${tomorrowStr}). No Slack sent.`
      )
      return
    }
    logger.error('[SLOT_OVERRIDES_CRON] Job failed:', error)
    const message = error instanceof Error ? error.message : String(error)
    await sendSlackNotification(`Slot overrides job failed: ${message}`, logger)
    throw error
  }
}

export const config = {
  name: 'generate-tomorrow-slot-overrides',
  // schedule: '42 17 * * *' // Every day at 5:20 PM
  schedule: '1 0 * * *' // Every day at 12:01 AM
}
