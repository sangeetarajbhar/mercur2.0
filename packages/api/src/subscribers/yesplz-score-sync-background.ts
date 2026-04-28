import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"
import { logger } from "@medusajs/framework/logger"

import { YesPlzEvents } from "../shared/events/yesplz-events"
import { SEARCH_MODULE } from "../modules/search"
import SearchModuleService from "../modules/search/service"

interface NotificationData {
  to: string
  channel: string
  template: string
}

interface YesPlzScoreSyncBackgroundEventData {
  transaction_id: string
  user_id: string
  score_map: Record<string, number>
  parse_errors?: Array<{ product_id: string; error: string }>
  notification?: NotificationData
  redirectNotification?: string
}

const formatDuration = (durationMs: number) => {
  const seconds = Math.floor(durationMs / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export default async function yesPlzScoreSyncBackgroundSubscriber({
  event,
  container,
}: SubscriberArgs<YesPlzScoreSyncBackgroundEventData>) {
  if (event.name !== YesPlzEvents.SCORE_SYNC_PROCESS_BACKGROUND) {
    return
  }

  const {
    transaction_id,
    user_id,
    score_map,
    parse_errors,
    notification,
    redirectNotification,
  } = event.data

  const notificationService =
    container.resolve<INotificationModuleService>(Modules.NOTIFICATION)

  const startTime = Date.now()

  logger.debug(
    `[YesPlz Score Sync] Starting background sync transaction_id=${transaction_id} products=${Object.keys(score_map || {}).length}`
  )

  try {
    const searchService =
      container.resolve<InstanceType<typeof SearchModuleService>>(SEARCH_MODULE)

    const scoreMap = new Map<string, number>(Object.entries(score_map || {}))

    if (scoreMap.size === 0) {
      await notificationService.createNotifications({
        to: notification?.to || user_id || "admin",
        channel: notification?.channel || "feed",
        template: notification?.template || "admin-ui",
        data: {
          title: "YesPlz Product Scores – No valid rows",
          description: "No valid product scores to sync. Check product_id and final_score columns.",
          transaction_id,
          export_type: "yesplz_score_sync",
          redirect: redirectNotification || "/yesplz",
        },
      })
      return
    }

    const { updatedCount, failedCount, failedItems } =
      await searchService.syncScores(container as any, scoreMap)

    const formattedDuration = formatDuration(Date.now() - startTime)

    logger.debug(
      `[YesPlz Score Sync] Completed transaction_id=${transaction_id} duration=${formattedDuration} updated=${updatedCount} failed=${failedCount}`
    )

    await notificationService.createNotifications({
      to: notification?.to || user_id || "admin",
      channel: notification?.channel || "feed",
      template: notification?.template || "admin-ui",
      data: {
        title: "YesPlz Product Scores Sync Completed",
        description:
          failedCount === 0
            ? `Product scores synced successfully in ${formattedDuration}. ${updatedCount} products updated.`
            : `Product scores sync completed in ${formattedDuration}. ${updatedCount} updated, ${failedCount} failed.`,
        transaction_id,
        export_type: "yesplz_score_sync",
        synced_count: updatedCount,
        updated_count: updatedCount,
        failed_count: failedCount,
        total_rows: scoreMap.size + (parse_errors?.length ?? 0),
        failed: failedItems?.length ? failedItems.slice(0, 50) : undefined,
        parse_errors: parse_errors?.length ? parse_errors.slice(0, 50) : undefined,
        redirect: redirectNotification || "/yesplz",
      },
    })
  } catch (error: unknown) {
    const formattedDuration = formatDuration(Date.now() - startTime)
    const errorMessage =
      error instanceof Error ? error.message : String(error ?? "Unknown error")

    logger.error(
      `[YesPlz Score Sync] Failed after ${formattedDuration} transaction_id=${transaction_id} error=${errorMessage}`,
      error instanceof Error ? error : undefined
    )

    await notificationService.createNotifications({
      to: notification?.to || user_id || "admin",
      channel: notification?.channel || "feed",
      template: notification?.template || "admin-ui",
      data: {
        title: "YesPlz Product Scores Sync Failed",
        description: `Product scores sync failed after ${formattedDuration}: ${errorMessage}. Transaction ID: ${transaction_id}`,
        transaction_id,
        export_type: "yesplz_score_sync",
        error_message: errorMessage,
        redirect: redirectNotification || "/yesplz",
      },
    })
  }
}

export const config: SubscriberConfig = {
  event: [YesPlzEvents.SCORE_SYNC_PROCESS_BACKGROUND],
}
