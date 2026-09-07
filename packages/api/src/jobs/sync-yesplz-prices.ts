import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { logger } from "@medusajs/framework/logger"
import { INotificationModuleService } from "@medusajs/framework/types"

import { SEARCH_MODULE } from "../modules/search"
import SearchModuleService from "../modules/search/service"

const LOG_PREFIX = "[sync-yesplz-prices]"

const formatDuration = (durationMs: number) => {
  const seconds = Math.floor(durationMs / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export default async function syncYesPlzPricesJob(container: MedusaContainer) {
  // Guard: only run if explicitly enabled via env var
  const cronEnabled =
    process.env.CRON_ENABLED_YESPLZ_PRICE_SYNC === "1" ||
    process.env.CRON_ENABLED_YESPLZ_PRICE_SYNC === "true" ||
    process.env.CRON_ENABLED_YESPLZ_PRICE_SYNC === "TRUE"

  if (!cronEnabled) {
    logger.info(`${LOG_PREFIX} Skipped: CRON_ENABLED_YESPLZ_PRICE_SYNC is not enabled`)
    return
  }

  const startTime = Date.now()
  const notifyUser = process.env.FEED_NOTIFY_USER_ID || "admin"

  logger.info(`${LOG_PREFIX} === JOB STARTED === notifyUser=${notifyUser}`)

  const notificationService =
    container.resolve<INotificationModuleService>(Modules.NOTIFICATION)

  try {
    const searchService =
      container.resolve<InstanceType<typeof SearchModuleService>>(SEARCH_MODULE)

    logger.info(`${LOG_PREFIX} Calling searchService.syncPrices (all published products)...`)

    const { updatedCount, failedCount, failedItems } =
      await searchService.syncPrices(container as any)

    const formattedDuration = formatDuration(Date.now() - startTime)

    logger.info(
      `${LOG_PREFIX} === JOB COMPLETED === ` +
      `updated=${updatedCount} failed=${failedCount} duration=${formattedDuration}`
    )

    // Send completion notification
    await notificationService.createNotifications({
      to: notifyUser,
      channel: "feed",
      template: "admin-ui",
      data: {
        title: "YesPlz Price Sync Completed (Scheduled)",
        description:
          failedCount === 0
            ? `Price sync completed successfully in ${formattedDuration}. Synced ${updatedCount} products.`
            : `Price sync completed in ${formattedDuration}. Synced ${updatedCount} products, ${failedCount} failed.`,
        export_type: "yesplz_price_sync",
        synced_count: updatedCount,
        failed_count: failedCount,
        total_products: updatedCount + failedCount,
        failed: failedItems?.length ? failedItems.slice(0, 50) : undefined,
        redirect: "/yesplz",
      },
    })
  } catch (error: unknown) {
    const formattedDuration = formatDuration(Date.now() - startTime)
    const errorMessage =
      error instanceof Error ? error.message : String(error ?? "Unknown error")

    logger.error(
      `${LOG_PREFIX} === JOB FAILED === error=${errorMessage} duration=${formattedDuration}`
    )

    // Send failure notification
    try {
      await notificationService.createNotifications({
        to: notifyUser,
        channel: "feed",
        template: "admin-ui",
        data: {
          title: "YesPlz Price Sync Failed (Scheduled)",
          description: `Price sync failed after ${formattedDuration}: ${errorMessage}`,
          export_type: "yesplz_price_sync",
          error_message: errorMessage,
          redirect: "/yesplz",
        },
      })
    } catch (notifyErr: unknown) {
      logger.error(
        `${LOG_PREFIX} Failed to send failure notification: ${notifyErr instanceof Error ? notifyErr.message : String(notifyErr)}`
      )
    }
  }
}

export const config = {
  name: "sync-yesplz-prices",
  // Run at midnight daily (IST = UTC+5:30, so 00:00 IST = 18:30 UTC previous day)
  // If you want midnight UTC, use "0 0 * * *"
  schedule: process.env.CRON_SCHEDULE_YESPLZ_PRICE_SYNC || "0 0 * * *",
}
