import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework'
import { getLocationHierarchiesByParent } from '../../../shared/utils/location-hierarchy'
import { getVariantInventoryItemsByVariantId } from '../../../shared/utils/product-variant-inventory'

export type FetchOmniLocationIdByClusterVariantInput = {
    scope: MedusaContainer
    cluster_id: string
    variant_id: string
}

/**
 *
 * @param input - Contains scope, cluster_id (parent location), and variant_id
 * @returns The omni location_id where variant is available, or null if not found
 */
export async function fetchOmniLocationIdByClusterVariant({
    scope,
    cluster_id,
    variant_id
}: FetchOmniLocationIdByClusterVariantInput): Promise<string | null> {
    const query = scope.resolve(ContainerRegistrationKeys.QUERY)
    
    try {
        const locationHierarchies = await getLocationHierarchiesByParent(query, cluster_id)

        if (!locationHierarchies || locationHierarchies.length === 0) {
            return null
        }

        const omniLocationIds: string[] = locationHierarchies.map(
            (loc: { child_location_id: string }) => loc.child_location_id
        )

        if (omniLocationIds.length === 0) {
            return null
        }

        // Step 2: Get variant's inventory_item_id (cached util)
        const variantInventoryItems = await getVariantInventoryItemsByVariantId(
            query,
            variant_id
        )

        if (!variantInventoryItems || variantInventoryItems.length === 0) {
            return null
        }

        const inventoryItemIds = variantInventoryItems.map(
            (item: { inventory_item_id: string }) => item.inventory_item_id
        )

        // Step 3: Check inventory levels at omni locations
        // Find which omni location has available inventory for this variant
        const { data: inventoryLevels } = await query.graph({
            entity: 'inventory_level',
            fields: ['inventory_item_id', 'location_id', 'stocked_quantity', 'reserved_quantity'],
            filters: {
                inventory_item_id: inventoryItemIds,
                location_id: omniLocationIds
            }
        })

        if (!inventoryLevels || inventoryLevels.length === 0) {
            return null
        }

        // Step 4: Find the first omni location with available inventory
        // Available quantity = stocked_quantity - reserved_quantity
        for (const level of inventoryLevels) {
            const availableQty = Math.max(0, (level.stocked_quantity || 0) - (level.reserved_quantity || 0))

            if (availableQty > 0 && omniLocationIds.includes(level.location_id)) {
                return level.location_id
            }
        }

        // No omni location has available inventory
        return null

    } catch (error) {
        console.error('Error in fetchOmniLocationIdByClusterVariant:', error)
        return null
    }
}
