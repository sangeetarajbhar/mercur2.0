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

