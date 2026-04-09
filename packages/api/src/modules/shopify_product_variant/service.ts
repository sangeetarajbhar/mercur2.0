import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import { Context } from "@medusajs/framework/types"
import { ShopifyProductVariant } from "./models/shopify_product_variant"

class ShopifyProductVariantsModuleService extends MedusaService({
  ShopifyProductVariant,
}) {
  /**
   * Override delete to always use soft delete
   * Matches the generated MedusaService signature exactly
   * Defined as property to match base class definition
   */
  deleteShopifyProductVariants = async (
    primaryKeyValues: string | object | string[] | object[],
    sharedContext?: Context
  ): Promise<void> => {
    if (
      !primaryKeyValues ||
      (Array.isArray(primaryKeyValues) && primaryKeyValues.length === 0)
    ) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid ID")
    }
    await this.softDeleteShopifyProductVariants(
      primaryKeyValues,
      undefined,
      sharedContext
    )
  }
}

export default ShopifyProductVariantsModuleService

