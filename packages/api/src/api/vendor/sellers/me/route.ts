import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { fetchSellerByAuthActorId } from "../../../../shared/infra/http/utils/seller"
import { updateSellerWorkflow } from "../../../../workflows/seller/workflows"
import type { VendorUpdateSellerType } from "../validators"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope,
    req.queryConfig.fields
  )

  res.json({ seller })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorUpdateSellerType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  await updateSellerWorkflow(req.scope).run({
    input: {
      id,
      ...req.validatedBody,
    },
  })

  const {
    data: [seller],
  } = await query.graph(
    {
      entity: "seller",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ seller })
}

