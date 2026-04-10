import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { IProductModuleService } from '@medusajs/framework/types'

// Define types for database results
interface SellerLink {
  seller_id: string
}

interface VariantPriceSet {
  price_set_id: string
}

interface SellerPriceList {
  price_list_id: string
}

interface Price {
  id: string
  price_list_id: string
  price_set_id: string
  amount: number
  currency_code: string
}

interface PriceList {
  title: string
}

interface ProductVariantPriceSet {
  variant_id: string
}
interface Price {
  id: string;
  price_list_id: string;
  price_set_id: string;
  amount: number;
  currency_code: string;
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id: variantId } = req.params
  const productService = req.scope.resolve<IProductModuleService>(Modules.PRODUCT)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  try {
    // Step 1: Get variant
    const variant = await productService.retrieveProductVariant(variantId)

    // Step 2: Get inventory_item_id for this variant
    let inventoryItemId = null
    try {
      const result = await knex("product_variant_inventory_item")
        .where({ variant_id: variantId })
        .whereNull("deleted_at")
        .select("inventory_item_id")
        .first()

      if (result && result.inventory_item_id) {
        inventoryItemId = result.inventory_item_id
      }
    } catch (error) {
      console.error("Error fetching inventory item:", error)
      return res.status(500).json({ message: "Error fetching inventory data" })
    }
    if (!inventoryItemId) {
      return res.status(404).json({
        message: "No inventory item found for this variant",
        variant: {
          id: variant.id,
          product_id: variant.product_id
        }
      })
    }

    // Step 3: Get seller IDs mapped to this inventory item
    let sellerLinks: SellerLink[] = []
    try {
      sellerLinks = await knex("seller_seller_inventory_inventory_item")
        .where({ inventory_item_id: inventoryItemId })
        .whereNull("deleted_at")
        .select("seller_id")
    } catch (error) {
      console.error("Error fetching seller links:", error)
      return res.status(500).json({ message: "Error fetching seller data" })
    }

    const sellerIds = sellerLinks.map((s: SellerLink) => s.seller_id)

    if (sellerIds.length === 0) {
      return res.status(404).json({
        message: "No sellers found for this inventory item",
        variant: {
          id: variant.id,
          product_id: variant.product_id,
          inventory_item_id: inventoryItemId
        }
      })
    }

    // Step 4: Get all price sets for this variant
    const variantPriceSets: VariantPriceSet[] = await knex("product_variant_price_set")
      .where({ variant_id: variantId })
      .whereNull("deleted_at")
      .select("price_set_id")

    const priceSetIds = variantPriceSets.map((vps: VariantPriceSet) => vps.price_set_id)

    // Step 5: Fetch seller details with their price lists and associated prices
    const sellersWithPrices = await Promise.all(
      sellerIds.map(async (sellerId) => {
        // Get basic seller info
        const seller = await knex("seller")
          .where({ id: sellerId })
          .first()

        // Get price lists for this seller
        const sellerPriceLists: SellerPriceList[] = await knex("seller_seller_pricing_price_list")
          .where({ seller_id: sellerId })
          .whereNull("deleted_at")
          .select("price_list_id")

        const priceListIds = sellerPriceLists.map((spl: SellerPriceList) => spl.price_list_id)

        // Get prices that match both the variant's price sets and seller's price lists
        let prices: Price[] = []
        if (priceSetIds.length > 0 && priceListIds.length > 0) {
          // prices = await knex("price")
          //   .whereIn("price_set_id", priceSetIds)
          //   .whereIn("price_list_id", priceListIds)
          //   .whereNull("deleted_at")
          //   .select("id", "price_list_id", "price_set_id", "amount", "currency_code")
          const currentDate = new Date();
          prices = await knex("price")
          .join("price_list", "price.price_list_id", "price_list.id")
          .whereIn("price.price_set_id", priceSetIds)
          .whereIn("price.price_list_id", priceListIds)
          .whereNull("price.deleted_at")
          .where("price_list.status", "active")
          .whereNull("price_list.deleted_at")
          .andWhere((builder) => {
            builder
              .where(function () {
                this.whereNull("price_list.starts_at").whereNull("price_list.ends_at");
              })
              .orWhere(function () {
                this.where("price_list.starts_at", "<=", currentDate)
                  .andWhere("price_list.ends_at", ">=", currentDate);
              });
          })
          .select(
            "price.id",
            "price.price_list_id",
            "price.price_set_id",
            "price.amount",
            "price.currency_code"
          );

          // Optionally get more details about the price lists and price sets
          prices = await Promise.all(
            prices.map(async (price: Price) => {
              const priceList: PriceList | undefined = await knex("price_list")
                .where({ id: price.price_list_id })
                .select("title")
                .first()

              const productVariantPriceSet: ProductVariantPriceSet | undefined = await knex("product_variant_price_set")
                .where({ price_set_id: price.price_set_id })
                .whereNull("deleted_at")
                .select("variant_id")
                .first()

              return {
                ...price,
                ...(productVariantPriceSet || {}),
                ...(priceList || {})
              }
            })
          )
        }

        return {
          ...seller,
          prices
        }
      })
    )

    // Step 4: Fetch seller details
    // const sellers = await knex("seller").whereIn('id', sellerIds)

    return res.status(200).json({
      variant: {
        id: variant.id,
        product_id: variant.product_id,
        inventory_item_id: inventoryItemId,
        // sellers: sellers
        sellers: sellersWithPrices
      },
    });
  } catch (error) {
    console.error("Error fetching variant:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}
