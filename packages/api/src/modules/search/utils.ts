import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

/**
 * Filter products by status and return published vs other products
 * Used by search module to determine which products should be indexed
 * 
 * @param container - Medusa container
 * @param ids - Array of product IDs to filter (empty array returns empty results)
 * @returns Object with published and other product IDs
 */
export async function filterProductsByStatus(
  container: MedusaContainer,
  ids: string[] = []
): Promise<{ published: string[]; other: string[] }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  if (!ids || ids.length === 0) {
    return {
      published: [],
      other: []
    }
  }

  const { data: products } = await query.graph({
    entity: 'product',
    fields: ['id', 'status', 'deleted_at'],
    filters: {
      id: ids
    }
  })

  const validIds = products
    .filter((p) => p.status === 'published' && !p.deleted_at)
    .map((p) => p.id)

  const invalidIds = products
    .filter((p) => p.status !== 'published' || p.deleted_at)
    .map((p) => p.id)

  const missingIds = ids.filter(
    (id) => !products.some((product) => product.id === id)
  )

  const other = Array.from(new Set([...invalidIds, ...missingIds]))

  return {
    published: validIds,
    other
  }
}

export async function selectProductsAvailableLocationsBatch(
  container: MedusaContainer,
  product_ids: string[]
): Promise<Map<string, string[]>> {
  if (!product_ids || product_ids.length === 0) {
    return new Map()
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Get product <-> stock location mapping using query.graph instead of knex
  const { data: productLocationMappings } = await query.graph({
    entity: 'product_product_stock_location_stock_location',
    fields: ['product_id', 'stock_location_id', 'deleted_at'],
    filters: {
      product_id: { $in: product_ids }
    }
  })

  // Filter out deleted mappings
  const validMappings =
    (productLocationMappings || []).filter(
      (m: any) => !m.deleted_at && m.product_id && m.stock_location_id
    )

  const locationMap = new Map<string, string[]>()
  product_ids.forEach(id => locationMap.set(id, []))

  if (validMappings.length === 0) {
    return locationMap
  }

  // Unique parent location IDs (product's direct stock locations)
  const parentLocationIds = [...new Set(validMappings.map((m: any) => String(m.stock_location_id)).filter(Boolean))]

  if (parentLocationIds.length === 0) {
    return locationMap
  }

  // Fetch all children for these parents from location_hierarchy with query.graph
  const { data: locationHierarchies } = await query.graph({
    entity: 'location_hierarchy',
    fields: ['parent_location_id', 'child_location_id'],
    filters: { parent_location_id: { $in: parentLocationIds } }
  })

  // Build parent -> [parent, ...children]
  const parentToExpanded = new Map<string, string[]>()
  for (const locId of parentLocationIds) {
    parentToExpanded.set(locId, [locId])
  }
  ;(locationHierarchies || []).forEach((h: { parent_location_id: string; child_location_id: string }) => {
    const parentId = h.parent_location_id
    const childId = h.child_location_id
    if (!parentId || !childId) return
    let expanded = parentToExpanded.get(parentId)
    if (!expanded) {
      expanded = [parentId]
      parentToExpanded.set(parentId, expanded)
    }
    if (!expanded.includes(childId)) {
      expanded.push(childId)
    }
  })

  // Per product: for each of its direct locations, add that location + its children; dedupe
  validMappings.forEach((mapping: any) => {
    const productId = mapping.product_id
    const locationId = String(mapping.stock_location_id)
    if (!productId || !locationId) return

    const expanded = parentToExpanded.get(locationId) || [locationId]
    const existing = locationMap.get(productId) || []
    expanded.forEach((id: string) => {
      if (!existing.includes(id)) {
        existing.push(id)
      }
    })
    locationMap.set(productId, existing)
  })

  return locationMap
}

