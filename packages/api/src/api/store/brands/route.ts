import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { StoreGetBrandsParamsType } from "./validators"

export const defaultStoreBrandFields = ["id", "name", "handle"]

export const storeBrandQueryConfig = {
  list: {
    defaults: defaultStoreBrandFields,
    isList: true,
  },
}

export const GET = async (
  req: MedusaRequest<StoreGetBrandsParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: brands = [], metadata } = await query.graph({
    entity: "brand",
    fields: req.queryConfig?.fields?.length
      ? req.queryConfig.fields
      : defaultStoreBrandFields,
    filters: req.filterableFields ?? {},
    pagination: {
      ...(req.queryConfig?.pagination ?? {}),
      order: { name: "asc" },
    },
  })

  res.json({
    brands,
    count: metadata?.count ?? brands.length,
    offset: metadata?.skip ?? req.queryConfig?.pagination?.skip ?? 0,
    limit: metadata?.take ?? req.queryConfig?.pagination?.take ?? brands.length,
  })
}
