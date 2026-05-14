import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: reviews, metadata } = await query.graph({
    entity: "review",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    withDeleted: true,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    reviews,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take,
  })
}

