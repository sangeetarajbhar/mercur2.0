import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import { SELLER_MODULE } from '@mercurjs/seller'

/**
 * Associates orders with sellers by inserting records into the seller_seller_order_order junction table.
 *
 * @param input - Object containing orders and their corresponding sellers
 * @returns The original input for chaining
 */
export const associateSellerOrdersStep = createStep(
  'associate-seller-orders',
  async (input: {
    orders: { id: string, metadata?: any }[];
    sellers: string[];
  }, { container }) => {
    try {
      const { orders } = input;

      const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)

      // Ensure orders and sellers are arrays
      const ordersList = Array.isArray(orders) ? orders : [orders];

      // Map created order IDs to their respective sellers
      const sellerOrderAssociations: { seller_id: string; order_id: string }[] = [];

      for (let i = 0; i < ordersList.length; i++) {
        const sellerId = ordersList[i]?.metadata?.seller_id
        if (sellerId) {
          sellerOrderAssociations.push({
            seller_id: String(sellerId),
            order_id: String(ordersList[i].id)
          });
        }
      }

      // Insert the seller-order associations
      if (sellerOrderAssociations.length > 0) {
        for(const sellerOrderAssociation of sellerOrderAssociations) {
          await remoteLink.create({
            [SELLER_MODULE]: {
              seller_id: sellerOrderAssociation.seller_id
            },
            [Modules.ORDER]: {
              order_id: sellerOrderAssociation.order_id
            }
          })
        }
      }

      return new StepResponse(input, sellerOrderAssociations);
    } catch (error) {
      console.error("Error creating seller-order associations:", error);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to associate sellers with orders: ${error.message}`
      )
    }
  },
  // Medusa's built-in compensation function
  async (sellerOrderAssociations: { seller_id: string; order_id: string }[], { container }) => {
    if (!sellerOrderAssociations?.length) {
      return
    }

    try {
      const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)

      // Remove the seller-order associations
      for (const association of sellerOrderAssociations) {
        try {
          await remoteLink.dismiss({
            [SELLER_MODULE]: {
              seller_id: association.seller_id
            },
            [Modules.ORDER]: {
              order_id: association.order_id
            }
          })
        } catch (dismissError) {
          console.error(`Failed to dismiss link for seller ${association.seller_id} and order ${association.order_id}:`, dismissError)
        }
      }
    } catch (error) {
      console.error('Error during rollback of seller-order associations:', error)
      // Don't throw here to avoid masking the original error
    }
  }
)
