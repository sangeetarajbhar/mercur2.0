// src/api/store/locations/route.ts
import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const limit = Math.min(parseInt((req.query.limit as string) ?? '50', 10), 100)
  const offset = parseInt((req.query.offset as string) ?? '0', 10)
  const q = (req.query.q as string) || undefined
  const type = (req.query.type as string) || undefined // e.g. "darkstore"

  const ids = ((req.query.id as string) || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const filters: Record<string, any> = {}

  if (q) {
    // partial, case-insensitive match on name
    filters.name = { $ilike: `%${q}%` }
  }

  if (ids.length) {
    filters.id = { $in: ids }
  }

  // If you store location type on the extension module, filter via relation
  // Adjust the relation name & enum value casing to match your schema.
  if (type) {
    filters.location_type = type // e.g. "DARK_STORE"
  }

  // const { data: locations, metadata } = await query.graph({
  //   entity: 'stock_location',
  //   fields: ['id', 'name'],
  //   filters,
  //   pagination: { skip: offset, take: limit, order: { name: 'asc' } }
  // })

  const { data: extensions, metadata } = await query.graph({
    entity: "stock_location_extension", 
    fields: ["*", "stock_location.*"], 
    filters,
    pagination: { skip: offset, take: limit}
  })
  
  // Now, extensions will contain the filtered extensions and their linked stock_location records

  res.json({
    extensions,
    count: metadata?.count ?? extensions.length,
    offset: metadata?.skip ?? offset,
    limit: metadata?.take ?? limit,
  })
}
