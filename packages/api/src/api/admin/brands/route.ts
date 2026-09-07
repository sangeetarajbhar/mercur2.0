import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"

import { BRAND_MODULE } from "../../../modules/brand"
import type { AdminGetBrandsParamsType } from "./validators"

export async function GET(
  req: MedusaRequest<AdminGetBrandsParamsType>,
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

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const brandService = req.scope.resolve(BRAND_MODULE) as any

  const schema = z.object({
    name: z.string().min(1).trim(),
    is_active: z.boolean().optional(),
  })

  const { name, is_active } = schema.parse(req.body)
  const handle = name.toLowerCase().replace(/\s+/g, "-")

  const handleExists = await brandService.listBrands({ handle })
  if (handleExists.length > 0 && handleExists[0].handle === handle) {
    return res.status(400).json({ message: "Handle already exists" })
  }

  const brand = await brandService.createBrands({
    name,
    handle,
    is_active: is_active ?? true,
  })

  return res.json({ brand })
}
