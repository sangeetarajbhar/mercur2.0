import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { INotificationModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework"

import {
  PRICE_LIST_IMPORT_REQUEST_MODULE,
  PriceListImportRequestModuleService,
} from "../modules/price-list-import-request"
import { RequestEvents } from "../shared/events/request-events"
import { processPriceLists } from "../shared/utils/price-list/process-price-lists"

interface NotificationData {
  to: string
  channel: string
  template: string
}

interface PriceListAcceptBackgroundEventData {
  request_id: string
  reviewer_id: string
  reviewer_note: string
  user_id: string
  transaction_id: string
  notification?: NotificationData
  redirectNotification?: string
}

const LOCK_TIMEOUT_SEC = 180

export default async function requestPriceListAcceptBackgroundSubscriber({
  event,
  container,
}: SubscriberArgs<PriceListAcceptBackgroundEventData>) {
  if (event.name !== RequestEvents.PRICE_LIST_ACCEPT_PROCESS_BACKGROUND) {
    return
  }

  const {
    request_id,
    reviewer_id,
    reviewer_note,
    user_id,
    transaction_id,
    notification,
    redirectNotification,
  } = event.data

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as {
    info: (msg: string) => void
    warn: (msg: string) => void
    error: (msg: string, err?: unknown) => void
  }
  const notificationService =
    container.resolve<INotificationModuleService>(Modules.NOTIFICATION)
  const lockingService = container.resolve(Modules.LOCKING)
  const requestService = container.resolve<PriceListImportRequestModuleService>(
    PRICE_LIST_IMPORT_REQUEST_MODULE
  )

  const lockKey = `request-accept-price-list:${request_id}`
  let processed = false

  try {
    await lockingService.execute(
      lockKey,
      async () => {
        const requests = await requestService.listPriceListImportRequests(
          { id: request_id, status: "pending" },
          { take: 1 }
        )
        const request = requests[0]

        if (!request || request.type !== "price_list") {
          logger.info(
            `[REQUEST_BG] price_list accept skipped for request_id=${request_id} (already handled or wrong type)`
          )
          return
        }

        const notifyTo = notification?.to || user_id || reviewer_id
        const notifyChannel = notification?.channel || "seller_feed"
        const notifyTemplate = notification?.template || "admin-ui"
        const redirect = redirectNotification || "/admin/price-list-requests"

        await notificationService.createNotifications({
          to: notifyTo,
          channel: notifyChannel,
          template: notifyTemplate,
          data: {
            title: "Price List Request Processing Started",
            description: `Started accepting price list request. Transaction ID: ${transaction_id}`,
            transaction_id,
            export_type: "price_list_request_accept",
            redirect,
          },
        })

        const processedPriceLists = [{ data: request.data, submitter_id: request.submitter_id }]

        const startTime = Date.now()
        await processPriceLists(
          container as MedusaContainer,
          processedPriceLists,
          request.seller_id,
          transaction_id,
          request.file_name,
          { to: notifyTo, channel: notifyChannel, template: notifyTemplate, redirect },
          startTime
        )

        // Update request status to accepted
        await requestService.updatePriceListImportRequests({
          id: request_id,
          status: "accepted",
          reviewer_id,
          reviewer_note,
        })

        processed = true
      },
      { timeout: LOCK_TIMEOUT_SEC }
    )
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error ?? "Unknown error")

    logger.error(
      `[REQUEST_BG] price_list accept failed for request_id=${request_id}: ${errorMessage}`,
      error
    )

    await notificationService.createNotifications({
      to: notification?.to || user_id || reviewer_id,
      channel: notification?.channel || "seller_feed",
      template: notification?.template || "admin-ui",
      data: {
        title: "Price List Request Accept Failed",
        description: `Failed to accept price list request. Transaction ID: ${transaction_id}. Error: ${errorMessage}`,
        transaction_id,
        export_type: "price_list_request_accept",
        error_message: errorMessage,
        redirect: redirectNotification || "/admin/price-list-requests",
      },
    })

    // Mark the request as rejected on failure so it can be retried/resubmitted
    try {
      await requestService.updatePriceListImportRequests({
        id: request_id,
        status: "rejected",
        reviewer_id,
        reviewer_note: `Auto-rejected due to error: ${errorMessage}`,
      })
    } catch {
      logger.warn(`[REQUEST_BG] Could not update request ${request_id} status to rejected`)
    }
  }
}

export const config: SubscriberConfig = {
  event: [RequestEvents.PRICE_LIST_ACCEPT_PROCESS_BACKGROUND],
  context: { subscriberId: "request-price-list-accept-processor" },
}
