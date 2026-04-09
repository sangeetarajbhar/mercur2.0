import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { randomUUID } from "crypto"
import { syncYesPlzMarkInactiveBackgroundWorkflow } from "../../../../workflows/search/workflows/sync-yesplz-isactive-background"

/**
 * PATCH /admin/yesplz/isactive
 *
 * Body:
 * {
 *   "products": [
 *     { "pid": "prod_xxx", "status": true },
 *     { "pid": "prod_yyy", "status": false }
 *   ]
 * }
 * - pid: product ID (string)
 * - status: true = active, false = inactive
 */
export const PATCH = async (
  req: AuthenticatedMedusaRequest<{
    products?: Array<{ pid?: string; status?: boolean }>
  }>,
  res: MedusaResponse
) => {
  try {
    const raw = (req.body?.products as Array<{ pid?: string; status?: boolean }> | undefined) ?? []
    const products = raw
      .filter((p) => typeof p?.pid === "string" && p.pid.length > 0 && typeof p.status === "boolean")
      .map((p) => ({ pid: p.pid!, status: p.status! }))
    // If products is empty, we will run the fallback in background:
    // fetch not-published products from DB and mark isActive:false in YesPlz.

    const user_id =
      req.auth_context?.actor_id || process.env.FEED_NOTIFY_USER_ID || "admin"
    const transaction_id = randomUUID()

    const { result } = await syncYesPlzMarkInactiveBackgroundWorkflow.run({
      container: req.scope,
      input: {
        user_id,
        transaction_id,
        products,
        channel: "feed",
      },
    })

    return res.status(202).json({
      transaction_id: result.transaction_id ?? transaction_id,
      status: result.status ?? "processing",
      message:
        result.message ??
        "Update isActive started in background. You will be notified when it completes.",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return res.status(500).json({
      message: "Failed to start update isActive",
      error: message,
    })
  }
}

