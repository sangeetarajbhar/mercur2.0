import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { randomUUID } from "crypto"

import {
  generateProductVariantFeedBackgroundWorkflow,
} from "../../../../workflows/product-feed/workflows/generate-product-variant-feed-background"
import type { AdminGetProductVariantFeedParamsType } from "./validators"

export async function GET(
  req: AuthenticatedMedusaRequest<AdminGetProductVariantFeedParamsType>,
  res: MedusaResponse
) {
  const rawLoop =
    (req.validatedQuery as AdminGetProductVariantFeedParamsType)?.loop ??
    (req.query as any)?.loop
  const loop = rawLoop ? Number(rawLoop) : undefined;

  const rawPageSize =
    (req.validatedQuery as AdminGetProductVariantFeedParamsType)?.page_size ??
    (req.query as any)?.page_size
  const page_size = rawPageSize ? Number(rawPageSize) : undefined;

  const transaction_id = randomUUID()
  const user_id = req.auth_context?.actor_id || "admin"

  const { result } = await generateProductVariantFeedBackgroundWorkflow(
    req.scope
  ).run({
    input: {
      transaction_id,
      user_id,
      loop,
      page_size,
    },
  })

  res.json(result)
}


