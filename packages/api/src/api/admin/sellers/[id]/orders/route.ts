import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type { AdminGetSellerOrdersParamsType } from "../../validators"

export const GET = async (
  req: MedusaRequest<AdminGetSellerOrdersParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders, metadata } = await query.graph({
    entity: "order",
    fields: req.queryConfig.fields,
    filters: {
      ...req.filterableFields,
      seller_id: req.params.id,
    },
    pagination: req.queryConfig.pagination,
  })

  res.json({
    orders,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take,
  })
}

