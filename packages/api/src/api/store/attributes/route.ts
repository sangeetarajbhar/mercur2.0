import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type { StoreGetAttributesParamsType } from "./validators"

export const storeAttributeQueryConfig = {
  list: {
    defaults: [
      "id",
      "name",
      "description",
      "handle",
      "is_filterable",
      "is_required",
      "ui_component",
      "metadata",
      "*possible_values",
    ],
    isList: true,
  },
}

export const GET = async (
  req: MedusaRequest<StoreGetAttributesParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: attributes = [], metadata } = await query.graph({
    entity: "attribute",
    fields: req.queryConfig?.fields ?? storeAttributeQueryConfig.list.defaults,
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
