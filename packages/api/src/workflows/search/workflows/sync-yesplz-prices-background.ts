import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"
import { logger } from "@medusajs/framework/logger"

import { SEARCH_MODULE } from "../../../modules/search"
import SearchModuleService from "../../../modules/search/service"

const LOG_PREFIX = "[sync-yesplz-prices-bg]"

const formatDuration = (durationMs: number) => {
  const seconds = Math.floor(durationMs / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export interface YesPlzPriceSyncBackgroundInput {
  user_id: string
  transaction_id: string
  product_ids?: string[]
  channel?: string
}

/**
 * Step 1: Execute the price sync directly.
 * Previously this step just emitted an event to a subscriber.
 * Now it calls searchService.syncPrices() directly, making the workflow
 * self-contained and removing the dependency on the event bus.
 */
const executePriceSyncStep = createStep(
  "execute-yesplz-price-sync",
  async (input: YesPlzPriceSyncBackgroundInput, { container }) => {
    const startTime = Date.now()
    const scope =
      input.product_ids?.length === 1
        ? `single_id`
        : input.product_ids?.length
          ? `ids=${input.product_ids.length}`
          : `all_published`

    logger.info(
      `${LOG_PREFIX} Step started: transaction_id=${input.transaction_id} scope=${scope}`
    )

    const searchService =
      container.resolve<InstanceType<typeof SearchModuleService>>(SEARCH_MODULE)

    const { updatedCount, failedCount, failedItems } =
      await searchService.syncPrices(container as any, input.product_ids)

    const durationMs = Date.now() - startTime
    logger.info(
      `${LOG_PREFIX} Step completed: updated=${updatedCount} failed=${failedCount} duration=${formatDuration(durationMs)}`
    )

    return new StepResponse({
      transaction_id: input.transaction_id,
      user_id: input.user_id,
      channel: input.channel || "feed",
      updatedCount,
      failedCount,
      failedItems,
      durationMs,
    })
  }
)

/**
 * Step 2: Send notification with sync results.
 * Handles both success and partial-failure cases.
 */
const notifySyncResultStep = createStep(
  "notify-yesplz-price-sync-result",
  async (
    input: {
      transaction_id: string
      user_id: string
      channel: string
      updatedCount: number
      failedCount: number
      failedItems: Array<{ product_id: string; error: string }>
      durationMs: number
    },
    { container }
  ) => {
    const notificationService =
      container.resolve<INotificationModuleService>(Modules.NOTIFICATION)

    const formattedDuration = formatDuration(input.durationMs)

    await notificationService.createNotifications({
      to: input.user_id || "admin",
      channel: input.channel || "feed",
      template: "admin-ui",
      data: {
        title: "YesPlz Price Sync Completed",
        description:
          input.failedCount === 0
            ? `Price sync completed successfully in ${formattedDuration}. Synced ${input.updatedCount} products.`
            : `Price sync completed in ${formattedDuration}. Synced ${input.updatedCount} products, ${input.failedCount} failed.`,
        transaction_id: input.transaction_id,
        export_type: "yesplz_price_sync",
        synced_count: input.updatedCount,
        failed_count: input.failedCount,
        total_products: input.updatedCount + input.failedCount,
        failed: input.failedItems?.length
          ? input.failedItems.slice(0, 50)
          : undefined,
        redirect: "/yesplz",
      },
    })

    logger.info(
      `${LOG_PREFIX} Notification sent to user=${input.user_id} transaction_id=${input.transaction_id}`
    )

    return new StepResponse({ notified: true })
  }
)

/**
 * Workflow: sync-yesplz-prices-background
 *
 * Executes the price sync directly in a workflow step (no event bus dependency).
 * Called from the admin API route at /admin/yesplz/prices.
 */
export const syncYesPlzPricesBackgroundWorkflow = createWorkflow(
  "sync-yesplz-prices-background",
  function (input: YesPlzPriceSyncBackgroundInput) {
    const syncResult = executePriceSyncStep(input)
    notifySyncResultStep(syncResult)

    return new WorkflowResponse({
      transaction_id: input.transaction_id,
      status: "processing" as const,
      message:
        "Price sync started in background. You will be notified when it completes.",
    })
  }
)
