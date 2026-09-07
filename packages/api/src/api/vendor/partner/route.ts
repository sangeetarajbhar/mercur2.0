import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: partner } = await query.graph({
    entity: "partner",
    fields: req.queryConfig.fields,
    pagination: req.queryConfig.pagination,
    filters: { status: "1" },
  })
  res.json({ partner })
}
