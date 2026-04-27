import type {
  BigNumberInput,
  IInventoryService,
} from "@medusajs/framework/types"
import {
  MathBN,
  MedusaError,
  Modules,
  promiseAll,
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { Knex } from 'knex'
import { CACHE_ENABLE, CacheTTLMap, UseQueryGraphStepCacheKey } from "../../../shared/utils/redisKey";

/**
 * The details of the cart items to confirm their inventory availability.
 */
export interface ConfirmVariantInventoryStepInput {
  /**
   * The items to confirm inventory for.
   */
  items: {
    /**
     * The ID of the inventory item associated with the line item's variant.
     */
    inventory_item_id: string
    /**
     * The number of units a single quantity is equivalent to. For example, if a customer orders one quantity of the variant, Medusa checks the availability of the quantity multiplied by the
     * value set for `required_quantity`. When the customer orders the quantity, Medusa reserves the ordered quantity multiplied by the value set for `required_quantity`.
     */
    required_quantity: number
    /**
     * Whether the variant can be ordered even if it's out of stock. If a variant has this enabled, the step doesn't throw an error.
     */
    allow_backorder: boolean
    /**
     * The quantity in the cart.
     */
    quantity: BigNumberInput
    /**
     * The ID of the stock locations that the inventory quantity is available in.
     */
    location_ids: string[]
    /**
     * The variant ID for seller-specific validation
     */
    variant_id?: string
    /**
     * The seller ID for seller-specific validation
     */
    seller_id?: string
    /**
     * The cluster ID for cluster-based validation
     */
    cluster_id?: string
  }[]
}

export const confirmInventoryStepId = "confirm-custom-inventory-step"
/**
 * This step validates that items in the cart have sufficient inventory quantity.
 * If an item doesn't have sufficient inventory, an error is thrown.
 *
 * @example
 * confirmInventoryStep({
 *   items: [
 *     {
 *       inventory_item_id: "iitem_123",
 *       required_quantity: 1,
 *       allow_backorder: false,
 *       quantity: 1,
 *       location_ids: ["sloc_123"]
 *     }
 *   ]
 * })
 */
export const confirmInventoryStep = createStep(
  confirmInventoryStepId,
  async (data: ConfirmVariantInventoryStepInput, { container }) => {
    if (!data.items?.length) {
      return new StepResponse({ success: true, message: null }, [])
    }

    const inventoryService = container.resolve<IInventoryService>(
      Modules.INVENTORY
    )
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex

    const promises = data.items.map(async (item) => {
      if (item.allow_backorder) {
        return { success: true, item }
      }

      const itemQuantity = MathBN.mult(item.quantity, item.required_quantity)

      // CLUSTER-BASED VALIDATION: If cluster_id and seller_id are provided
      if (item.cluster_id && item.seller_id && item.variant_id) {
        try {
          const darkStoreLocationIdCacheKey = `${UseQueryGraphStepCacheKey.GET_LOCATION_HIERARCHIES}${item.cluster_id}`
          const ttl = CacheTTLMap[UseQueryGraphStepCacheKey.GET_LOCATION_HIERARCHIES]

          // Get location hierarchy - include child OMNI stores
          const locationHierarchiesResult = await query.graph({
            entity: 'location_hierarchy',
            fields: ['parent_location_id', 'child_location_id', 'id'],
            filters: { parent_location_id: item.cluster_id },
          },
            {
              cache: {
                enable: CACHE_ENABLE,
                ttl: ttl,
                key: darkStoreLocationIdCacheKey,
              },
            }
          )

          const locationHierarchies = locationHierarchiesResult.data || []
          const childLocations = locationHierarchies.map((loc: { child_location_id: string }) => loc.child_location_id)
          const allLocationIds = [item.cluster_id, ...childLocations]

          // Get inventory levels in cluster AND its child locations
          const inventoryLevelsResult = await query.graph({
            entity: 'inventory_level',
            fields: ['inventory_item_id', 'location_id', 'stocked_quantity', 'reserved_quantity'],
            filters: {
              inventory_item_id: item.inventory_item_id,
              location_id: allLocationIds
            }
          })
          const inventoryLevels = inventoryLevelsResult.data || []

          if (inventoryLevels.length === 0) {
            return {
              success: false,
              item,
              error: `No inventory available in the selected location`
            }
          }

          // Check if seller is mapped to cluster or child locations
          const sellerLocationMappings = await knex('seller_seller_stock_location_stock_location')
            .select('seller_id', 'stock_location_id')
            .where('seller_id', item.seller_id)
            .whereIn('stock_location_id', allLocationIds)
            .whereNull('deleted_at')

          const sellerLocationIds = sellerLocationMappings.map(m => m.stock_location_id)

          if (sellerLocationIds.length === 0) {
            return {
              success: false,
              item,
              error: `Product not available from this seller in the selected location`
            }
          }

          // Calculate available inventory (only from locations where seller is mapped)
          const availableQty = inventoryLevels
            .filter((level: { location_id: string; stocked_quantity?: number; reserved_quantity?: number }) =>
              sellerLocationIds.includes(level.location_id))
            .reduce((sum: number, level: { stocked_quantity?: number; reserved_quantity?: number }) => {
              const available = Math.max(0, (level.stocked_quantity || 0) - (level.reserved_quantity || 0))
              return sum + available
            }, 0)

          // Check if we have sufficient inventory
          const requiredQty = Number(itemQuantity)
          if (availableQty < requiredQty) {
            const msg = availableQty === 0
              ? 'Item has no stock'
              : `Only ${availableQty} items available in stock`
            return {
              success: false,
              item,
              error: msg,
              availableQty
            }
          }

          return { success: true, item }

        } catch {
          return {
            success: false,
            item,
            error: `Unable to validate inventory. Please try again.`
          }
        }
      } else {
        // FALLBACK: Use default Medusa inventory validation for items without cluster_id
        const hasInventory = await inventoryService.confirmInventory(
          item.inventory_item_id,
          item.location_ids,
          itemQuantity
        )

        return {
          success: hasInventory,
          item,
          error: hasInventory ? undefined : `Insufficient inventory available`
        }
      }
    })

    const inventoryResults = await promiseAll(promises)
    const failedItems = inventoryResults.filter(result => !result.success)

    if (failedItems.length > 0) {
      // Throw error with custom flag for API handling
      const firstError = failedItems[0]
      const message = firstError.error || 'Insufficient inventory available'

      const error = new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        message,
        MedusaError.Codes.INSUFFICIENT_INVENTORY
      )
      // Add custom flag and data
      const augmentedError = error as MedusaError & { validationFailed?: boolean; availableQty?: number }
      augmentedError.validationFailed = true
      augmentedError.availableQty = firstError.availableQty
      throw error
    }

    return new StepResponse(null)
  }
)
