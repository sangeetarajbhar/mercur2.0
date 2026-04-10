import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { randomUUID } from "crypto"
import { syncYesPlzInventoryBackgroundWorkflow } from "../../../../workflows/search/workflows/sync-yesplz-inventory-background"

export const PATCH = async (
  req: AuthenticatedMedusaRequest<{ product_ids?: string[] }>,
  res: MedusaResponse
) => {
  try {
    const bodyIds = (req.body?.product_ids as string[] | undefined) ?? undefined
    const user_id =
      req.auth_context?.actor_id || process.env.FEED_NOTIFY_USER_ID || "admin"
    const transaction_id = randomUUID()

    const { result } = await syncYesPlzInventoryBackgroundWorkflow.run({
      container: req.scope,
      input: {
        user_id,
        transaction_id,
        product_ids: bodyIds?.length ? bodyIds : undefined,
        channel: "feed",
      },
    })

    return res.status(202).json({
      transaction_id: result.transaction_id ?? transaction_id,
      status: result.status ?? "processing",
      message:
        result.message ??
        "Inventory sync started in background. You will be notified when it completes.",
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to start inventory sync",
      error: error.message,
    })
  }
}

