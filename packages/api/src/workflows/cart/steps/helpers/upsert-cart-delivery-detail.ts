import { CART_DELIVERY_DETAIL_MODULE } from '../../../../modules/cart-delivery-detail'
import CartDeliveryDetailService from '../../../../modules/cart-delivery-detail/service'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework'

type DeliveryDetailData = {
  delivery_type: string
  delivery_date: Date
  start_time: string
  end_time: string
  slot_id?: string | null
}

/**
 * Shared helper to upsert (update or create) cart delivery details
 * Reduces code duplication across standard and slotted delivery steps
 * @throws Error if database operation fails
 */
export async function upsertCartDeliveryDetail(
  cart_id: string,
  data: DeliveryDetailData,
  container: MedusaContainer
): Promise<void> {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const cartDeliveryDetailService = container.resolve<CartDeliveryDetailService>(CART_DELIVERY_DETAIL_MODULE)

    // Check if delivery detail already exists for this cart
    const { data: existingDetails } = await query.graph({
      entity: 'cart_delivery_detail',
      filters: { cart_id, deleted_at: { $eq: null } },
      fields: ['id']
    })

    if (existingDetails && existingDetails.length > 0) {
      // Update existing record
      const result = await cartDeliveryDetailService.updateCartDeliveryDetails({
        id: existingDetails[0].id,
        ...data
      })

      if (!result) {
        throw new Error('Failed to update cart delivery detail')
      }
    } else {
      // Create new record
      const result = await cartDeliveryDetailService.createCartDeliveryDetails({
        cart_id,
        ...data
      })

      if (!result) {
        throw new Error('Failed to create cart delivery detail')
      }
    }
  } catch (error) {
    console.error('Error in upsertCartDeliveryDetail:', error)
    throw new Error(
      `Failed to save delivery details: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

