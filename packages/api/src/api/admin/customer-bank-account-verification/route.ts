import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { parseDateFilter } from "../../../utils/helpers/common-filter-helpers"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const userId = req.auth_context?.actor_id
  if (!userId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Unauthorized user")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const filterableFields = req.filterableFields || {}
  const { q, ...restFilters } = filterableFields as Record<string, unknown> & { q?: string }
  const filters: Record<string, unknown> = { ...restFilters }
  const extractedOrderParam = { current: undefined as string | undefined }
  filters.created_at = parseDateFilter(filters.created_at, extractedOrderParam)
  filters.updated_at = parseDateFilter(filters.updated_at, extractedOrderParam)

  if (q && q.trim().length > 0) {
    const search = `%${q.trim()}%`
    filters.$or = [
      { id: { $ilike: search } },
      { customer_refund_method_id: { $ilike: search } },
      { fav_id: { $ilike: search } },
      { fund_account_id: { $ilike: search } },
      { contact_id: { $ilike: search } },
      { utr: { $ilike: search } },
      { registered_name: { $ilike: search } },
    ]
  }

  const { data, metadata } = await query.graph({
    entity: "customer_bank_account_verification",
    fields: [...req.queryConfig.fields],
    filters,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    customer_bank_account_verifications: data,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take,
  })
}
