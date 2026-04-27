import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import type { MedusaContainer } from '@medusajs/framework'

type QueryLike = {
  graph: (input: unknown, options?: unknown) => Promise<{ data: unknown }>
}

export async function resolveOmniLocationForProductsBulk({
  scope,
  cluster_id,
  items
}: {
  scope: MedusaContainer
  cluster_id: string
  items: Array<{ product_id: string; seller_id: string | null }>
}): Promise<Map<string, string | null>> {
  const resolvedLocationByProductId = new Map<string, string | null>()

  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as QueryLike

  // 1) Fetch omni locations (children of cluster) once per request.
  const { data: locationHierarchies } = await query.graph(
    {
      entity: 'location_hierarchy',
      fields: ['child_location_id'],
      filters: { parent_location_id: cluster_id }
    },
    {
      cache: {
        enable: true,
        key: `plp:location_hierarchy:${cluster_id}`,
        ttl: 5 * 60 * 1000
      }
    }
  )

  const omniLocationIds: string[] = Array.isArray(locationHierarchies)
    ? locationHierarchies
        .map((l: unknown) =>
          typeof l === 'object' && l !== null && 'child_location_id' in l
            ? (l as { child_location_id?: unknown }).child_location_id
            : undefined
        )
        .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)
    : []

  if (!omniLocationIds.length) {
    for (const it of items) resolvedLocationByProductId.set(it.product_id, null)
    return resolvedLocationByProductId
  }

  // 2) Group products by seller for seller-scoped omni location filtering.
  const productIdsBySeller = new Map<string, string[]>()
  for (const it of items) {
    if (!it.seller_id) {
      resolvedLocationByProductId.set(it.product_id, null)
      continue
    }
    const arr = productIdsBySeller.get(it.seller_id)
    if (arr) arr.push(it.product_id)
    else productIdsBySeller.set(it.seller_id, [it.product_id])
  }

  // 3) Resolve omni location in bulk per seller.
  await Promise.all(
    Array.from(productIdsBySeller.entries()).map(async ([sellerId, productIds]) => {
      try {
        // Seller-scoped omni locations for this seller
        const { data: sellerLocations } = await query.graph(
          {
            entity: 'seller_seller_stock_location_stock_location',
            fields: ['stock_location_id'],
            filters: {
              seller_id: sellerId,
              stock_location_id: { $in: omniLocationIds }
            }
          },
          {
            cache: {
              enable: true,
              key: `plp:seller_stock_locations:${sellerId}:${cluster_id}`,
              ttl: 5 * 60 * 1000
            }
          }
        )

        const sellerScopedOmniLocationIds: string[] = Array.isArray(sellerLocations)
          ? sellerLocations
              .map((r: unknown) =>
                typeof r === 'object' && r !== null && 'stock_location_id' in r
                  ? (r as { stock_location_id?: unknown }).stock_location_id
                  : undefined
              )
              .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)
          : []

        if (!sellerScopedOmniLocationIds.length) {
          for (const pid of productIds) resolvedLocationByProductId.set(pid, null)
          return
        }

        // Fetch all variants for all products (one call)
        const { data: variants } = await query.graph(
          {
            entity: 'product_variant',
            fields: ['id', 'product_id'],
            filters: { product_id: productIds }
          },
          {
            cache: {
              enable: true,
              key: `plp:variants:${productIds.join(',')}`,
              ttl: 5 * 60 * 1000
            }
          }
        )

        const variantIdToProductId = new Map<string, string>()
        const allVariantIds: string[] = []
        if (Array.isArray(variants)) {
          for (const v of variants) {
            const obj =
              typeof v === 'object' && v !== null
                ? (v as { id?: unknown; product_id?: unknown })
                : null
            const vid = obj?.id
            const pid = obj?.product_id
            if (typeof vid === 'string' && typeof pid === 'string') {
              variantIdToProductId.set(vid, pid)
              allVariantIds.push(vid)
            }
          }
        }

        if (!allVariantIds.length) {
          for (const pid of productIds) resolvedLocationByProductId.set(pid, null)
          return
        }

        // Resolve inventory items for all variants (one call)
        const { data: variantInventoryItems } = await query.graph(
          {
            entity: 'product_variant_inventory_item',
            fields: ['variant_id', 'inventory_item_id'],
            filters: { variant_id: allVariantIds }
          },
          {
            cache: {
              enable: true,
              key: `plp:variant_inventory_items:${allVariantIds.join(',')}`,
              ttl: 5 * 60 * 1000
            }
          }
        )

        const inventoryItemIdToProductId = new Map<string, string>()
        const inventoryItemIds: string[] = []
        if (Array.isArray(variantInventoryItems)) {
          for (const row of variantInventoryItems) {
            const obj =
              typeof row === 'object' && row !== null
                ? (row as { variant_id?: unknown; inventory_item_id?: unknown })
                : null
            const vid = obj?.variant_id
            const iid = obj?.inventory_item_id
            if (typeof vid !== 'string' || typeof iid !== 'string') continue
            const pid = variantIdToProductId.get(vid)
            if (!pid) continue
            inventoryItemIdToProductId.set(iid, pid)
            inventoryItemIds.push(iid)
          }
        }

        if (!inventoryItemIds.length) {
          for (const pid of productIds) resolvedLocationByProductId.set(pid, null)
          return
        }

        // Fetch inventory levels in seller-scoped omni locations (one call)
        const { data: inventoryLevels } = await query.graph(
          {
            entity: 'inventory_level',
            fields: [
              'inventory_item_id',
              'location_id',
              'stocked_quantity',
              'reserved_quantity'
            ],
            filters: {
              inventory_item_id: inventoryItemIds,
              location_id: sellerScopedOmniLocationIds
            }
          },
          {
            cache: {
              enable: true,
              key: `plp:inventory_levels:${sellerId}:${cluster_id}`,
              ttl: 5 * 60 * 1000
            }
          }
        )

        const chosenLocationByProductId = new Map<string, string>()

        if (Array.isArray(inventoryLevels)) {
          for (const lvl of inventoryLevels) {
            const obj =
              typeof lvl === 'object' && lvl !== null
                ? (lvl as {
                    inventory_item_id?: unknown
                    location_id?: unknown
                    stocked_quantity?: unknown
                    reserved_quantity?: unknown
                  })
                : null
            const iid = obj?.inventory_item_id
            const loc = obj?.location_id
            if (typeof iid !== 'string' || typeof loc !== 'string') continue

            const stocked = Number(obj?.stocked_quantity ?? 0)
            const reserved = Number(obj?.reserved_quantity ?? 0)
            const availableQty = Math.max(0, stocked - reserved)
            if (availableQty <= 0) continue

            const pid = inventoryItemIdToProductId.get(iid)
            if (!pid) continue
            if (chosenLocationByProductId.has(pid)) continue

            chosenLocationByProductId.set(pid, loc)
          }
        }

        for (const pid of productIds) {
          resolvedLocationByProductId.set(pid, chosenLocationByProductId.get(pid) ?? null)
        }
      } catch {
        for (const pid of productIds) resolvedLocationByProductId.set(pid, null)
      }
    })
  )

  return resolvedLocationByProductId
}

