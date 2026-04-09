import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"

import { YesPlzEvents } from "../shared/events/yesplz-events"
import { SEARCH_MODULE } from "../modules/search"
import SearchModuleService from "../modules/search/service"
// import { formatDuration } from "../shared/utils/date-utils"
const formatDuration = (ms: number) => `${Math.max(0, Math.round(ms / 1000))}s`

interface NotificationData {
  to: string
  channel: string
  template: string
}

interface YesPlzMarkInactiveBackgroundEventData {
  transaction_id: string
  user_id: string
  products: Array<{ pid: string; status: boolean }>
  notification?: NotificationData
  redirectNotification?: string
}

const PRODUCT_FETCH_PAGE_SIZE = 500

export default async function yesPlzMarkInactiveBackgroundSubscriber({
  event,
  container,
}: SubscriberArgs<YesPlzMarkInactiveBackgroundEventData>) {
  if (event.name !== YesPlzEvents.MARK_INACTIVE_PROCESS_BACKGROUND) {
    return
  }

  const {
    transaction_id,
    user_id,
    products,
    notification,
    redirectNotification,
  } = event.data

  const notificationService =
    container.resolve<INotificationModuleService>(Modules.NOTIFICATION)

  const startTime = Date.now()

  try {
    const searchService =
      container.resolve<InstanceType<typeof SearchModuleService>>(SEARCH_MODULE)

    const explicitProductsToSync = (products ?? []).map((p) => ({
      productId: p.pid,
      isActive: p.status,
    }))

    // If request provided explicit products, sync only those (small payload).
    // Otherwise, bulk fallback: fetch not-published/deleted products from DB and mark them inactive in YesPlz.
    let updatedCount = 0
    let failedCount = 0
    const failedItems: Array<{ product_id: string; error: string }> = []
    let totalProducts = 0

    if (explicitProductsToSync.length > 0) {
      totalProducts = explicitProductsToSync.length
      const result = await searchService.syncUpdateIsActive(container as any, explicitProductsToSync)
      updatedCount += result.updatedCount
      failedCount += result.failedCount
      failedItems.push(...(result.failedItems || []))
    } else {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      let skip = 0

      while (true) {
        const { data: page } = await query.graph({
          entity: "product",
          fields: ["id", "status", "deleted_at"],
          filters: {
            $or: [{ status: { $ne: "published" } }, { deleted_at: { $ne: null } }],
          },
          pagination: { skip, take: PRODUCT_FETCH_PAGE_SIZE },
        })

        const pageIds = (page || []).map((p: any) => p.id).filter(Boolean)
        if (pageIds.length > 0) {
          totalProducts += pageIds.length
          const pageProductsToSync = pageIds.map((id: string) => ({ productId: id, isActive: false }))
          const pageResult = await searchService.syncUpdateIsActive(container as any, pageProductsToSync)
          updatedCount += pageResult.updatedCount
          failedCount += pageResult.failedCount
          if (pageResult.failedItems?.length) {
            failedItems.push(...pageResult.failedItems)
          }
        }

        if (!page || page.length < PRODUCT_FETCH_PAGE_SIZE) {
          break
        }
        skip += page.length
      }
    }

    const formattedDuration = formatDuration(Date.now() - startTime)

    await notificationService.createNotifications({
      to: notification?.to || user_id || "admin",
      channel: notification?.channel || "feed",
      template: notification?.template || "admin-ui",
      data: {
        title: "YesPlz Update isActive Completed",
        description:
          failedCount === 0
            ? `Update isActive completed in ${formattedDuration}. Updated ${updatedCount} products.`
            : `Update isActive completed in ${formattedDuration}. Updated ${updatedCount}, ${failedCount} failed.`,
        transaction_id,
        export_type: "yesplz_update_is_active",
        synced_count: updatedCount,
        failed_count: failedCount,
        total_products: totalProducts,
        failed: failedItems.length ? failedItems.slice(0, 50) : undefined,
        redirect: redirectNotification || "/yesplz",
      },
    })
  } catch (error: any) {
    const formattedDuration = formatDuration(Date.now() - startTime)
    const errorMessage = error?.message || String(error || "Unknown error")

    await notificationService.createNotifications({
      to: notification?.to || user_id || "admin",
      channel: notification?.channel || "feed",
      template: notification?.template || "admin-ui",
      data: {
        title: "YesPlz Update isActive Failed",
        description: `Update isActive failed after ${formattedDuration}: ${errorMessage}. Transaction ID: ${transaction_id}`,
        transaction_id,
        export_type: "yesplz_update_is_active",
        error_message: errorMessage,
        redirect: redirectNotification || "/yesplz",
      },
    })
  }
}

export const config: SubscriberConfig = {
  event: [YesPlzEvents.MARK_INACTIVE_PROCESS_BACKGROUND],
}

