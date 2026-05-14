import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type { AdminGetSellerProductsParamsType } from "../../validators"

export const GET = async (
  req: MedusaRequest<AdminGetSellerProductsParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: req.queryConfig.fields,
    filters: {
      seller_id: req.params.id,
      deleted_at: { $eq: null },
    },
    pagination: req.queryConfig.pagination,
  })

  res.json({
    products,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  })
}

