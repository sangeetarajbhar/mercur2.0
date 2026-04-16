import { Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'

export type CreatePriceListImportSuccessNotificationInput = {
  seller_id: string
  file_name: string
  isRequestFlow: boolean
  count: number
}

type NotificationInput = Omit<CreatePriceListImportSuccessNotificationInput, 'isRequestFlow'>

/** Request-created path: "Import Complete" / "Request admin to accept the request" */
export const createPriceListImportRequestCreatedNotificationStep = createStep(
  'create-price-list-import-request-created-notification',
  async (input: NotificationInput & { count: number }, { container }) => {
    const service = container.resolve(Modules.NOTIFICATION)
    try {
      await service.createNotifications({
        to: input.seller_id,
        channel: 'seller_feed',
        template: 'vendor-ui',
        content: { subject: 'Price List Import Complete' },
        data: {
          title: 'Import Complete',
          description: `Price list import of "${input.file_name}" has been submitted. Request admin to accept the request.`,
          status: 'Request admin to accept the request',
          redirect: '/vendor/requests/price-list'
        }
      })
      return new StepResponse(undefined)
    } catch (err) {
      console.error('Failed to send notification for price list import success:', err)
      return new StepResponse(undefined)
    }
  }
)

/** Direct-import path: "Import completed successfully" */
export const createPriceListImportDirectSuccessNotificationStep = createStep(
  'create-price-list-import-direct-success-notification',
  async (input: NotificationInput & { count: number }, { container }) => {
    const service = container.resolve(Modules.NOTIFICATION)
    try {
      await service.createNotifications({
        to: input.seller_id,
        channel: 'seller_feed',
        template: 'vendor-ui',
        content: { subject: 'Price List Import Completed Successfully' },
        data: {
          title: 'Import Completed Successfully',
          description:
            input.count > 0
              ? `Price list import of "${input.file_name}" completed successfully. ${input.count} price list(s) created/updated.`
              : `Price list import of "${input.file_name}" completed successfully.`,
          status: 'Import completed successfully',
          redirect: '/vendor/price-lists/import'
        }
      })
      return new StepResponse(undefined)
    } catch (err) {
      console.error('Failed to send notification for price list import success:', err)
      return new StepResponse(undefined)
    }
  }
)
