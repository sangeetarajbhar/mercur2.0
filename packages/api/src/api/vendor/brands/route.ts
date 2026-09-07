import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type { VendorGetBrandsParamsType } from "./validators"

export async function GET(
  req: MedusaRequest<VendorGetBrandsParamsType>,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: brands = [], metadata } = await query.graph({
    entity: "brand",
    fields: req.queryConfig?.fields?.length
      ? req.queryConfig.fields
      : ["id", "name", "handle", "is_active"],
    filters: req.filterableFields ?? {},
    pagination: {
      ...(req.queryConfig?.pagination ?? {}),
      order: { name: "asc" },
    },
  })

  return res.json({
    brands,
    count: metadata?.count ?? brands.length,
    offset: metadata?.skip ?? req.queryConfig?.pagination?.skip ?? 0,
    limit: metadata?.take ?? req.queryConfig?.pagination?.take ?? brands.length,
  })
}
