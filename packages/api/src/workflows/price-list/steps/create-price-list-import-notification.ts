import { Modules } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

type NotificationInput = {
  seller_id: string
  file_name: string
  count: number
}

export const createPriceListImportSuccessNotificationStep = createStep(
  "create-price-list-import-success-notification",
  async (input: NotificationInput, { container }) => {
    const service = container.resolve(Modules.NOTIFICATION)
    try {
      await service.createNotifications({
        to: input.seller_id,
        channel: "seller_feed",
        template: "vendor-ui",
        content: { subject: "Price List Import Completed Successfully" },
        data: {
          title: "Import Completed Successfully",
          description:
            input.count > 0
              ? `Price list import of "${input.file_name}" completed successfully. ${input.count} price list(s) created/updated.`
              : `Price list import of "${input.file_name}" completed successfully.`,
          status: "Import completed successfully",
          redirect: "/vendor/price-list/import",
        },
      })
      return new StepResponse(undefined)
    } catch (err) {
      console.error("Failed to send import success notification:", err)
      return new StepResponse(undefined)
    }
  }
)
