import type { Knex } from 'knex'

type WithCreatedAt = Record<string, unknown> & {
  created_at?: string | Date | null
}

/** `order_extra_detail` columns needed for this route + admin `location_detail` (not full table `*`). */
const ORDER_EXTRA_DETAIL_COLUMNS = [
  'oed.id',
  'oed.order_id',
  'oed.stock_location_id',
  'oed.marketplace_order_id',
  'oed.invoice_id',
  'oed.packed_by'
] as const

export type OrderExtraDetailRow = {
  id: string
  order_id: string
  stock_location_id: string
  marketplace_order_id: string
  invoice_id: string | null
  packed_by: string | Date | null
}

/**
 * Params for {@link paginateSellerOrderIdsViaOrderExtraDetail}.
 *
 * Lists/paginates `order_id`s from `order_extra_detail` through `order` and `seller_seller_order_order`.
 * `partnerStockLocationIds` restricts `oed.stock_location_id` (seller_partner_stock_location_ids Redis list).
 * Assumes at most one `order_extra_detail` row per order; `countDistinct` guards join duplication.
 *
 * Omit `limit` to fetch all matching ids (still ordered); set `limit`/`offset` for a page.
 */
export type PaginateSellerOrdersViaOedInput = {
  sellerId: string
  /** Filter OED rows to these stock location ids. Empty array yields no rows. */
  partnerStockLocationIds: string[]
  startDate?: Date
  endExclusive?: Date
  status?: string
  limit?: number
  offset?: number
  sortDesc: boolean
}

export async function paginateSellerOrderIdsViaOrderExtraDetail(
  knex: Knex,
  p: PaginateSellerOrdersViaOedInput
): Promise<{
  orderIds: string[]
  totalCount: number
  orderExtraDetails: OrderExtraDetailRow[]
}> {
  const baseQuery = () => {
    let q = knex('order_extra_detail as oed')
      .innerJoin('order as o', 'o.id', 'oed.order_id')
      .innerJoin(
        'seller_seller_order_order as soo',
        'soo.order_id',
        'oed.order_id'
      )
      .whereNull('o.deleted_at')
      .where('soo.seller_id', p.sellerId)
      .whereNull('soo.deleted_at')
      .whereNull('oed.deleted_at')

    if (p.status) {
      q = q.where('o.status', p.status)
    }
    if (p.partnerStockLocationIds.length === 0) {
      q = q.whereRaw('false')
    } else {
      q = q.whereIn('oed.stock_location_id', p.partnerStockLocationIds)
    }
    if (p.startDate) {
      q = q.where('o.created_at', '>=', p.startDate)
    }
    if (p.endExclusive) {
      q = q.where('o.created_at', '<', p.endExclusive)
    }
    return q
  }

  const countRow = await baseQuery()
    .countDistinct('oed.order_id as total')
    .first()
  const totalCount = parseInt(String((countRow as { total?: string })?.total ?? '0'), 10)

  let rowsQuery = baseQuery().select(...ORDER_EXTRA_DETAIL_COLUMNS)
    .orderBy('o.created_at', p.sortDesc ? 'desc' : 'asc')

  const off = p.offset ?? 0
  if (p.limit !== undefined) {
    rowsQuery = rowsQuery.limit(p.limit).offset(off)
  } else if (off > 0) {
    rowsQuery = rowsQuery.offset(off)
  }

  const pageRows = (await rowsQuery) as OrderExtraDetailRow[]
  return {
    orderIds: pageRows.map((r) => r.order_id),
    totalCount,
    orderExtraDetails: pageRows
  }
}

/** Remote query does not preserve `IN (...)` order; align response to the SQL page order. */
export function sortOrdersByIdList<T extends { id: string }>(
  rows: T[],
  orderIds: string[]
): T[] {
  const rank = new Map(orderIds.map((id, i) => [id, i]))
  return [...rows].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  )
}

export const getLatestByCreatedAt = <T extends WithCreatedAt>(
  items: T[] | null | undefined
): T | null => {
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  return [...items].sort((a, b) => {
    const dateA = a?.created_at ? new Date(a.created_at).getTime() : 0
    const dateB = b?.created_at ? new Date(b.created_at).getTime() : 0

    return dateB - dateA
  })[0]
}
