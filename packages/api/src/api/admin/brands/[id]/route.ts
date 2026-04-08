import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"

import { BRAND_MODULE } from "../../../../modules/brand"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data: [brand] = [] } = await query.graph({
    entity: "brand",
    fields: ["id", "name", "handle", "is_active"],
    filters: { id },
  })

  if (!brand) {
    return res.status(404).json({ message: "Brand not found" })
  }

  return res.json({ brand })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const brandService = req.scope.resolve(BRAND_MODULE) as any
  const { id } = req.params

  const schema = z.object({
    name: z.string().min(1).trim(),
    is_active: z.boolean().optional(),
  })

  const { name, is_active } = schema.parse(req.body)
  const handle = name.toLowerCase().replace(/\s+/g, "-")

  const handleExists = await brandService.listBrands({ handle })
  if (
    handleExists.length > 0 &&
    handleExists[0].handle === handle &&
    handleExists[0].id !== id
  ) {
    return res.status(400).json({ message: "Handle already exists" })
  }

  const [brand] = await brandService.updateBrands([
    {
      id,
      name,
      handle,
      ...(is_active !== undefined ? { is_active } : {}),
    },
  ])

  return res.json({ brand })
}

export async function DELETE(_req: MedusaRequest, res: MedusaResponse) {
  return res.status(405).json({ message: "Method not allowed" })
}
