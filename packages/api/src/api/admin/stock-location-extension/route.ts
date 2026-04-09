import {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Knex } from "knex"

const EXTENSION_TABLE = "stock_location_extension"
const LINK_TABLE = "stock_location_stock_location_extension"
const LOCATION_TABLE = "stock_location"

function buildBaseQuery(knex: Knex, locationType?: string, searchQ?: string) {
  let query = knex(`${EXTENSION_TABLE} as s0`)
    .innerJoin(`${LINK_TABLE} as link`, "link.stock_location_extension_id", "s0.id")
    .innerJoin(`${LOCATION_TABLE} as sl`, "sl.id", "link.stock_location_id")
    .whereNull("s0.deleted_at")
    .whereNull("link.deleted_at")
    .whereNull("sl.deleted_at")

  if (locationType !== undefined && locationType !== null) {
    query = query.where("s0.location_type", String(locationType))
  }
  if (searchQ && searchQ.trim()) {
    query = query.whereRaw("sl.name ILIKE ?", [`%${searchQ.trim()}%`])
  }
  return query
}

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
  const filterableFields = (req.filterableFields || {}) as Record<string, unknown>
  const q = typeof filterableFields.q === "string" ? filterableFields.q.trim() : ""
  const skipParam = req.queryConfig?.pagination?.skip ?? filterableFields.offset
  const takeParam = req.queryConfig?.pagination?.take ?? filterableFields.limit
  const skip = skipParam != null ? Number(skipParam) : 0
  const take = takeParam != null ? Number(takeParam) : undefined
  const locationType =
    filterableFields.location_type !== undefined && filterableFields.location_type !== null
      ? String(filterableFields.location_type)
      : undefined
  const idFilter = filterableFields.id

  const baseQuery = buildBaseQuery(knex, locationType, q)

  if (idFilter != null) {
    const ids = Array.isArray(idFilter) ? idFilter : [idFilter]
    baseQuery.whereIn("s0.id", ids)
  }

  const countResult = await baseQuery.clone().count("* as count").first()
  const total = Number((countResult as { count?: string } | undefined)?.count ?? 0)

  let dataQuery = baseQuery
    .clone()
    .select("s0.*", "sl.id as stock_location_id", "sl.name as stock_location_name")
    .orderBy("s0.id")
  if (take != null) {
    dataQuery = dataQuery.limit(take).offset(skip)
  } else if (skip > 0) {
    dataQuery = dataQuery.offset(skip)
  }
  const rows = await dataQuery

  const stock_location_extensions = rows.map((row: Record<string, unknown>) => {
    const { stock_location_id, stock_location_name, ...rest } = row
    return {
      ...rest,
      stock_location: {
        id: stock_location_id,
        name: stock_location_name,
      },
    }
  })

  res.json({
    stock_location_extensions,
    count: total,
    offset: skip,
    limit: take ?? total,
  })
}
