import {
  CreateLineItemForCartDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

export interface ExtendedLineItem extends CreateLineItemForCartDTO {
  seller_id?: string
}

/**
 * Input for the getSellerLineItemActionsStep
 */
export type GetSellerLineItemActionsStepInput = {
  id: string
  items: ExtendedLineItem[]
}

/**
 * Output for the getSellerLineItemActionsStep
 */
export type GetSellerLineItemActionsStepOutput = {
  itemsToCreate: ExtendedLineItem[]
  itemsToUpdate: { id: string; quantity: number, variant_id: string, unit_price: number, compare_at_unit_price: number }[]
}

export const getSellerLineItemActionsStepId = "get-seller-line-item-actions"

/**
 * Custom step to determine line item actions based on seller information
 * This ensures that items from different sellers are always created as separate line items
 */
export const getSellerLineItemActionsStep = createStep(
  getSellerLineItemActionsStepId,
  async (
    data: GetSellerLineItemActionsStepInput,
    context
  ): Promise<StepResponse<GetSellerLineItemActionsStepOutput>> => {
    const { container } = context

    // Fetch existing line items from the cart using knex

    // Get knex connection
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Fetch existing line items
    // const existingLineItems = await knex("cart_line_item")
    //   .select(["id", "variant_id", "quantity", "unit_price", "metadata"])
    //   .where("cart_id", data.id)
    //   .whereNull("deleted_at")

    const existingLineItems = await knex("cart_line_item as cli")
      .select([
        "cli.id",
        "cli.variant_id",
        "cli.quantity",
        "cli.unit_price",
        "cli.compare_at_unit_price",
        "cli.metadata",
        "ssc.seller_id"
      ])
      .leftJoin(
        "seller_seller_cart_line_item as ssc",
        "cli.id",
        "ssc.line_item_id"
      )
      .where("cli.cart_id", data.id)
      .whereNull("cli.deleted_at")

    // Group new items by variant_id and seller_id
    const itemsByVariantAndSeller = {}

    // Process each new item
    for (const item of data.items) {
      // Extract seller_id from metadata
      const sellerId = item.seller_id

      // Create a unique key combining variant_id and seller_id
      const key = `${item.variant_id}:${sellerId}`

      // Check if we already have this variant+seller combination in the new items
      if (!itemsByVariantAndSeller[key]) {
        itemsByVariantAndSeller[key] = {
          ...item,
          seller_id: sellerId, // Add seller_id for later use in createLineItemsStep
        }
      } else {
        // Combine quantities for same variant+seller
        const currentQuantity = itemsByVariantAndSeller[key].quantity || 1
        const newQuantity = item.quantity || 1
        itemsByVariantAndSeller[key].quantity = currentQuantity + newQuantity
      }
    }

    // Check existing line items to determine if we should update or create
    const itemsToCreate: ExtendedLineItem[] = []
    const itemsToUpdate: { id: string; quantity: number, variant_id: string, unit_price: number, compare_at_unit_price: number }[] = []

    // Process each grouped item
    for (const key in itemsByVariantAndSeller) {
      const item = itemsByVariantAndSeller[key]
      const [variantId, sellerId] = key.split(":")

      // Find if there's an existing line item with the same variant and seller
      const existingLineItem = existingLineItems.find(li => {
        // Get the seller ID for this line item from our mapping
        // const lineItemSellerId = data.items[0].seller_id

        // Only match if both variant_id and seller_id match
        return li.variant_id === variantId && li.seller_id === sellerId
      })

      if (existingLineItem) {
        console.log(`Found existing line item ${existingLineItem.id} for variant ${variantId} and seller ${sellerId}`)
        // Update existing line item
        itemsToUpdate.push({
          id: existingLineItem.id,
          quantity: existingLineItem.quantity + item.quantity,
          variant_id: item.variant_id!,
          unit_price: item.unit_price ?? existingLineItem.unit_price,
          compare_at_unit_price:
            item.compare_at_unit_price ?? existingLineItem.compare_at_unit_price         
        })
      } else {
        console.log(`No existing line item found for variant ${variantId} and seller ${sellerId}, creating new one`)
        // Create new line item
        itemsToCreate.push({
          ...item,
          variant_id: variantId,
          seller_id: sellerId,
        })
      }
    }

    return new StepResponse({
      itemsToCreate,
      itemsToUpdate,
    })
  }
)