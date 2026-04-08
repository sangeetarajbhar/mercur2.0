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

  const normalizedCreatedAt = parseDateFilter(filters?.created_at, extractedOrderParam)
  if (normalizedCreatedAt !== undefined) filters.created_at = normalizedCreatedAt
  const normalizedUpdatedAt = parseDateFilter(filters?.updated_at, extractedOrderParam)
  if (normalizedUpdatedAt !== undefined) filters.updated_at = normalizedUpdatedAt

  if (q && q.trim().length > 0) {
    const search = `%${q.trim()}%`
    filters.$or = [
      { id: { $ilike: search } },
      { provider_payout_id: { $ilike: search } },
      { provider_fund_account_id: { $ilike: search } },
      { return_id: { $ilike: search } },
      { order_id: { $ilike: search } },
      { customer_refund_method_id: { $ilike: search } },
      { customer_id: { $ilike: search } },
      { type_id: { $ilike: search } },
    ]
  }

  const { data: payoutTransactions, metadata } = await query.graph({
    entity: "payout_transactions",
    fields: [...req.queryConfig.fields],
    filters,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    payout_transactions: payoutTransactions,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take,
  })
}
