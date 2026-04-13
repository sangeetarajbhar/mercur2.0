import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"

import { YesPlzEvents } from "../shared/events/yesplz-events"
import { SEARCH_MODULE } from "../modules/search"
import SearchModuleService from "../modules/search/service"

interface NotificationData {
  to: string
  channel: string
  template: string
}

interface YesPlzPriceSyncBackgroundEventData {
  transaction_id: string
  user_id: string
  product_ids?: string[]
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

export default async function yesPlzPriceSyncBackgroundSubscriber({
  event,
  container,
}: SubscriberArgs<YesPlzPriceSyncBackgroundEventData>) {
  if (event.name !== YesPlzEvents.PRICE_SYNC_PROCESS_BACKGROUND) {
    return
  }

  const {
    transaction_id,
    user_id,
    product_ids,
    notification,
    redirectNotification,
  } = event.data

  const notificationService =
    container.resolve<INotificationModuleService>(Modules.NOTIFICATION)

  const startTime = Date.now()

  try {
    const searchService =
      container.resolve<InstanceType<typeof SearchModuleService>>(SEARCH_MODULE)

    const { updatedCount, failedCount, failedItems } =
      await searchService.syncPrices(container as any, product_ids)

    const formattedDuration = formatDuration(Date.now() - startTime)

    await notificationService.createNotifications({
      to: notification?.to || user_id || "admin",
      channel: notification?.channel || "feed",
      template: notification?.template || "admin-ui",
      data: {
        title: "YesPlz Price Sync Completed",
        description:
          failedCount === 0
            ? `Price sync completed successfully in ${formattedDuration}. Synced ${updatedCount} products.`
            : `Price sync completed in ${formattedDuration}. Synced ${updatedCount} products, ${failedCount} failed.`,
        transaction_id,
        export_type: "yesplz_price_sync",
        synced_count: updatedCount,
        failed_count: failedCount,
        total_products: updatedCount + failedCount,
        failed: failedItems?.length ? failedItems.slice(0, 50) : undefined,
        redirect: redirectNotification || "/yesplz",
      },
    })
  } catch (error: unknown) {
    const formattedDuration = formatDuration(Date.now() - startTime)
    const errorMessage =
      error instanceof Error ? error.message : String(error ?? "Unknown error")

    await notificationService.createNotifications({
      to: notification?.to || user_id || "admin",
      channel: notification?.channel || "feed",
      template: notification?.template || "admin-ui",
      data: {
        title: "YesPlz Price Sync Failed",
        description: `Price sync failed after ${formattedDuration}: ${errorMessage}. Transaction ID: ${transaction_id}`,
        transaction_id,
        export_type: "yesplz_price_sync",
        error_message: errorMessage,
        redirect: redirectNotification || "/yesplz",
      },
    })
  }
}

export const config: SubscriberConfig = {
  event: [YesPlzEvents.PRICE_SYNC_PROCESS_BACKGROUND],
}

