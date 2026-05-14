import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type { VendorUpdateReviewType } from "../../../validators"
import { updateReviewWorkflow } from "../../../../../../workflows/review/workflows"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [review],
  } = await query.graph({
    entity: "review",
    fields: req.queryConfig.fields,
    filters: { id, ...req.filterableFields },
  })

  res.json({ review })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorUpdateReviewType>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  await updateReviewWorkflow(req.scope).run({
    input: { id, ...req.validatedBody },
  })

  const {
    data: [review],
  } = await query.graph({
    entity: "review",
    fields: req.queryConfig.fields,
    filters: { id, ...req.filterableFields },
  })

  res.json({ review })
}

