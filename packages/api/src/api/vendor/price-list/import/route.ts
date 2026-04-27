import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { randomUUID } from "crypto"

import { fetchSellerByAuthActorId } from "../../../../shared/infra/http/utils"
import { PriceListImportEvents } from "../../../../shared/events/price-list-import-events"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  console.log("req.validatedBody >>>>>>>>>>>>>>>>>>>>>")
  const input = (req as any).file
  if (!input) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No CSV file was uploaded for importing price lists."
    )
  }

  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )

  const transaction_id = randomUUID()
  const eventBus = req.scope.resolve(Modules.EVENT_BUS)

  await eventBus.emit({
    name: PriceListImportEvents.PROCESS_BACKGROUND,
    data: {
      transaction_id,
      seller_id: seller.id,
      submitter_id: req.auth_context.actor_id,
      file_name: input.originalname,
      file_content: input.buffer.toString("utf-8"),
      notification: {
        to: seller.id,
        channel: "seller_feed",
        template: "vendor-ui",
        redirectNotification: "/vendor/price-list/import",
      },
      redirectNotification: "/vendor/price-list/import",
    },
  })

  return res.status(202).json({
    transaction_id,
    status: "queued",
    message: "Price list import queued for background processing.",
  })
}
