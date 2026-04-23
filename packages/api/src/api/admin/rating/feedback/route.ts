import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { AdminGetRatingFeedbackParamsType } from "../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetRatingFeedbackParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const filters: Record<string, any> = {
    ...(req.filterableFields ?? {}),
  }

  // Transform created_at range filters if provided
  const createdFrom = (filters.created_from as string | undefined) ?? undefined
  const createdTo = (filters.created_to as string | undefined) ?? undefined
  delete filters.created_from
  delete filters.created_to

  if (createdFrom || createdTo) {
    filters.created_at = {}
    if (createdFrom) filters.created_at.$gte = new Date(createdFrom)
    if (createdTo) filters.created_at.$lte = new Date(createdTo)
  }

  const { data: feedback = [], metadata } = await query.graph({
    entity: "rating_feedback",
    fields: [
      "id",
      "session_id",
      "customer_id",
      "order_id",
      "rating",
      "option_id",
      "custom_text",
      "status",
      "created_at",
    ],
    filters,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    feedback,
    count: metadata?.count ?? feedback.length,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 50,
  })
}

