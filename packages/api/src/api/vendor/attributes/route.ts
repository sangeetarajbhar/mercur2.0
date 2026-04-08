import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type { VendorGetAttributesParamsType } from "./validators"

export const GET = async (
  req: MedusaRequest<VendorGetAttributesParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: attributes = [], metadata } = await query.graph({
    entity: "attribute",
    fields: req.queryConfig?.fields,
    filters: req.filterableFields ?? {},
    pagination: req.queryConfig?.pagination,
  })

  res.json({
    attributes,
    count: metadata?.count ?? attributes.length,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? attributes.length,
  })
}
