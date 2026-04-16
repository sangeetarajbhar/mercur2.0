import {
  ContainerRegistrationKeys,
  MedusaError,
  MedusaService
} from '@medusajs/framework/utils'
import { FindConfig } from '@medusajs/framework/types'
import { Knex } from 'knex'

type VariantSellerType = {
  variant_id: string
  seller_id: string
  inventory_item_id: string
}

type ConstructorParams = {
  [key: string]: unknown
}

class VariantSellerService extends MedusaService({}) {
  protected readonly knex_: Knex

  constructor(container: ConstructorParams) {
    super(container)
    // Add type assertion to fix the TypeScript error
    this.knex_ = container[ContainerRegistrationKeys.PG_CONNECTION] as Knex
  }

  /**
   * Retrieves the seller for a specific variant by looking up through inventory items
   * @param variantId - The ID of the variant to get the seller for
   * @param config - Optional configurations for the query
   * @return The variant-seller relationship if found
   */
  async retrieveSellerByVariantId(
    variantId: string,
    config: FindConfig<VariantSellerType> = {}
  ): Promise<VariantSellerType | null> {
    try {
      // Step 1: Find inventory_item_id for the variant
      const inventoryItem = await this.knex_("product_variant_inventory_item")
        .where({ variant_id: variantId })
        .select("inventory_item_id")
        .first()

      if (!inventoryItem || !inventoryItem.inventory_item_id) {
        return null
      }

      // Step 2: Find seller_id for this inventory item
      const sellerItem = await this.knex_("seller_seller_inventory_inventory_item")
        .where({ inventory_item_id: inventoryItem.inventory_item_id })
        .select("seller_id")
        .first()

      if (!sellerItem || !sellerItem.seller_id) {
        return null
      }

      return {
        variant_id: variantId,
        inventory_item_id: inventoryItem.inventory_item_id,
        seller_id: sellerItem.seller_id
      }
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.DB_ERROR,
        `Failed to retrieve seller for variant: ${error.message}`
      )
    }
  }

  /**
   * Retrieves the sellers for multiple variants by looking up through inventory items
   * @param variantIds - The IDs of the variants to get sellers for
   * @return A map of variant IDs to seller IDs
   */
  async retrieveSellersByVariantIds(
    variantIds: string[]
  ): Promise<Map<string, string>> {
    if (!variantIds.length) {
      return new Map()
    }

    try {
      // First get inventory items for all variants
      const inventoryItems = await this.knex_("product_variant_inventory_item")
        .whereIn("variant_id", variantIds)
        .select(["variant_id", "inventory_item_id"])

      if (!inventoryItems.length) {
        return new Map()
      }

      const inventoryItemIds = inventoryItems.map(item => item.inventory_item_id)
      const inventoryToVariantMap = new Map(
        inventoryItems.map(item => [item.inventory_item_id, item.variant_id])
      )

      // Then get sellers for those inventory items
      const sellerItems = await this.knex_("seller_seller_inventory_inventory_item")
        .whereIn("inventory_item_id", inventoryItemIds)
        .select(["inventory_item_id", "seller_id"])

      // Create a map of variant_id -> seller_id
      const variantToSellerMap = new Map<string, string>()

      sellerItems.forEach(item => {
        const variantId = inventoryToVariantMap.get(item.inventory_item_id)
        if (variantId) {
          variantToSellerMap.set(variantId, item.seller_id)
        }
      })

      return variantToSellerMap
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.DB_ERROR,
        `Failed to retrieve sellers for variants: ${error.message}`
      )
    }
  }
}

export default VariantSellerService