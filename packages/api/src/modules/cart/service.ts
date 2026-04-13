import { Knex } from 'knex';
import { ContainerRegistrationKeys, MedusaService } from '@medusajs/framework/utils';
import { randomBytes } from "crypto";
import { logger } from '@medusajs/framework';
/**
 * Service to handle cart operations with seller-specific pricing
 */
class CartModuleService extends MedusaService({}) {
  protected readonly knex_: Knex

  constructor(container) {
    super(container)
    this.knex_ = container[ContainerRegistrationKeys.PG_CONNECTION] as Knex
  }
  /**
   * Apply seller-specific pricing to all line items in a cart
   * @param {string} cartId - The cart ID to process
   * @param {object} options - Optional parameters
   * @param {number} [options.custom_price] - Custom price to apply
   * @param {string} [options.variant_id] - Variant ID to apply custom price to
   * @param {string} [options.seller_id] - Seller ID to apply custom price to
   */
  async applySellerPricesToCart(
    cartId: string, 
    options?: {
      custom_price?: number
      variant_id?: string
      seller_id?: string
    }
  ): Promise<{
    cartId: string
    totalItems: number
    updatedCount: number
    details: any[]
  }> {
    try {
      // Get all non-deleted line items for this cart and filter in JavaScript
      const allLineItems = await this.knex_('cart_line_item')
        .select(['id', 'cart_id', 'variant_id', 'unit_price', 'metadata'])
        .where({ cart_id: cartId })
        .whereNull('deleted_at');

      // Filter line items with seller_id in metadata
      const lineItems = allLineItems.filter(item => {
        let metadata = item.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (e) {
            console.log('eeee: ', e);
            return false;
          }
        }
        return metadata && metadata.seller_id;
      });

      // Define the type for price update results
      type PriceUpdateResult = {
        lineItemId: string;
        variantId: string;
        sellerId: string;
        oldPrice: number;
        newPrice: number;
      }

      const updateResults: PriceUpdateResult[] = []
      let updatedCount = 0

      // Handle custom price if provided with variant_id and seller_id
      if (options?.custom_price !== undefined && options?.variant_id && options?.seller_id) {
        logger.debug(`Applying custom price ${options.custom_price} for variant ${options.variant_id} and seller ${options.seller_id}`)
        
        // Find the line item that matches the variant_id and seller_id
        for (const lineItem of lineItems) {
          try {
            // Handle both string and object metadata formats
            let metadata = lineItem.metadata
            if (typeof metadata === 'string') {
              try {
                metadata = JSON.parse(metadata)
              } catch (e) {
                console.error(`Error parsing metadata for line item ${lineItem.id}:`, e)
                continue
              }
            }

            const sellerId = metadata.seller_id
            const variantId = lineItem.variant_id

            // Check if this is the line item we want to update with custom price
            if (sellerId === options.seller_id && variantId === options.variant_id) {
              // Update the line item with the custom price
              await this.knex_('cart_line_item')
                .where({ id: lineItem.id })
                .update({
                  unit_price: options.custom_price,
                  is_custom_price: true,
                  // Update the raw_unit_price JSON field as well
                  raw_unit_price: JSON.stringify({
                    value: options.custom_price.toString(),
                    precision: 20
                  }),
                  // Add a note in metadata about the price update
                  metadata: this.knex_.raw(`
                    jsonb_set(
                      metadata::jsonb, 
                      '{price_source}', 
                      '"custom_price"'::jsonb
                    )
                  `)
                })

              updatedCount++
              updateResults.push({
                lineItemId: lineItem.id,
                variantId,
                sellerId,
                oldPrice: lineItem.unit_price,
                newPrice: options.custom_price
              })

              logger.debug(
                `Updated price for line item ${lineItem.id} from ${lineItem.unit_price} to ${options.custom_price} (custom price)`
              )
              
              // Skip normal price lookup for this item
              continue
            }
          } catch (itemError) {
            console.error(`Error processing line item ${lineItem.id}:`, itemError)
          }
        }
      }

      // Process each line item for normal seller pricing
      for (const lineItem of lineItems) {
        try {
          // Skip if we already applied a custom price to this line item
          if (updateResults.some(result => result.lineItemId === lineItem.id)) {
            continue
          }
          
          // Handle both string and object metadata formats
          let metadata = lineItem.metadata
          if (typeof metadata === 'string') {
            try {
              metadata = JSON.parse(metadata)
            } catch (e) {
              console.error(`Error parsing metadata for line item ${lineItem.id}:`, e)
              continue
            }
          }

          const sellerId = metadata.seller_id
          const variantId = lineItem.variant_id

          // Get seller-specific price for this variant
          const sellerVariantPrice = await this.getSellerPriceForVariant(
            sellerId,
            variantId
          )

          // Only update if we found a price and it's different from the current price
          if (
            sellerVariantPrice &&
            sellerVariantPrice.amount !== lineItem.unit_price
          ) {
            // Update the line item with the seller-specific price
            await this.knex_('cart_line_item')
              .where({ id: lineItem.id })
              .update({
                unit_price: sellerVariantPrice.amount,
                is_custom_price: true,
                // Update the raw_unit_price JSON field as well
                raw_unit_price: JSON.stringify({
                  value: sellerVariantPrice.amount.toString(),
                  precision: 20
                }),
                // Add a note in metadata about the price update
                metadata: this.knex_.raw(`
                  jsonb_set(
                    metadata::jsonb, 
                    '{price_source}', 
                    '"seller_specific"'::jsonb
                  )
                `)
              })

            updatedCount++
            updateResults.push({
              lineItemId: lineItem.id,
              variantId,
              sellerId,
              oldPrice: lineItem.unit_price,
              newPrice: sellerVariantPrice.amount
            })

            logger.debug(
              `Updated price for line item ${lineItem.id} from ${lineItem.unit_price} to ${sellerVariantPrice.amount}`
            )
          } else {
            logger.debug(
              `No price update needed for line item ${lineItem.id} (variant ${variantId}, seller ${sellerId}, as no price list is set)`
            )
          }
        } catch (itemError) {
          console.error(`Error processing line item ${lineItem.id}:`, itemError)
        }
      }

      return {
        cartId,
        totalItems: lineItems.length,
        updatedCount,
        details: updateResults
      }
    } catch (error) {
      console.error(`Error applying seller prices to cart ${cartId}:`, error)
      throw error
    }
  }

  /**
   * Get the seller-specific price for a variant using the correct pricing tables
   * @param {string} sellerId - The seller ID
   * @param {string} variantId - The variant ID
   * @returns {Promise<{amount: number} | null>} - The price if found
   */
  async getSellerPriceForVariant(
    sellerId: string,
    variantId: string
  ): Promise<{ amount: number } | null> {
    try {
      // Step 1: Get the price_set_id for this variant
      const variantPriceSet = await this.knex_('product_variant_price_set')
        .select('price_set_id')
        .where({ variant_id: variantId })
        .first()

      if (!variantPriceSet) {
        logger.debug(`No price set found for variant ${variantId}`)
        return null
      }

      // Step 2: Get ALL price_list_ids associated with this seller (not just the first)
      // Join with price_list to get additional data for prioritization
      const sellerPriceLists = await this.knex_('seller_seller_pricing_price_list')
        .join('price_list', 'price_list.id', 'seller_seller_pricing_price_list.price_list_id')
        .select([
          'seller_seller_pricing_price_list.price_list_id',
          'price_list.status',
          'price_list.type',
          'price_list.created_at'
        ])
        .where({ 'seller_seller_pricing_price_list.seller_id': sellerId })
        .where('price_list.status', '=', 'active')
        .whereNull('seller_seller_pricing_price_list.deleted_at')
        .whereNull('price_list.deleted_at')
        // Order by status (if available), then by created_at desc (newest first)
        .orderBy([
          { column: 'price_list.status', order: 'desc' },
          { column: 'price_list.created_at', order: 'desc' }
        ])

      if (!sellerPriceLists.length) {
        logger.debug(`No seller price lists found for variant ${variantId} and seller ${sellerId}`)
        return null
      }

      // Step 3: Try each price list in priority order until we find a price
      for (const priceList of sellerPriceLists) {
        const price = await this.knex_('price')
          .select('amount')
          .where({
            price_set_id: variantPriceSet.price_set_id,
            price_list_id: priceList.price_list_id
          })
          .first()

        if (price && price.amount) {
          logger.debug(`Found price ${price.amount} for variant ${variantId} and seller ${sellerId}`)
          return { amount: price.amount }
        }
      }

      logger.debug(`No price found for variant ${variantId} and seller ${sellerId}`)
      return null
    } catch (error) {
      console.error(
        `Error getting seller price for variant ${variantId} and seller ${sellerId}:`,
        error
      )
      return null
    }
  }
  public generateEntityId(prefix: string): string {
    const bytes = randomBytes(16);
    return `${prefix}_${bytes.toString("hex")}`;
  }
}

export default CartModuleService
