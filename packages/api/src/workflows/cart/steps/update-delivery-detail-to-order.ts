import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { ORDER_DELIVERY_DETAIL_MODULE } from '../../../modules/order-delivery-detail'
import OrderDeliveryDetailService from '../../../modules/order-delivery-detail/service'
import { createStep, StepResponse } from '@medusajs/workflows-sdk'
import { RemoteQueryFunction } from '@medusajs/framework/types'
import { validateDateIsTodayOrTomorrow, combineDateAndTime, validateDateTimeIsInFuture } from './helpers/delivery-validation-utils'

type UpdateDeliveryInfoToOrderInput = {
  cart_id: string
  order_set_id: string
}

/**
 * Step to copy cart delivery info to order delivery info
 */
export const updateDeliveryDetailToOrderStep = createStep(
  {
    name: 'update-delivery-info-to-order'
  },
  async (
    input: UpdateDeliveryInfoToOrderInput,
    { container }
  ) => {
    const { cart_id, order_set_id } = input

    try {
      const query = container.resolve(ContainerRegistrationKeys.QUERY) as RemoteQueryFunction
      const orderDeliveryInfoService = container.resolve<OrderDeliveryDetailService>(ORDER_DELIVERY_DETAIL_MODULE)

      // Get cart delivery info
      const { data: [cartDeliveryDetail] } = await query.graph({
        entity: 'cart_delivery_detail',
        fields: ['*'],
        filters: { cart_id, deleted_at: { $eq: null } }
      })

      // If no cart delivery info exists, this should not happen due to route validation
      // But if it does, we should stop the workflow since delivery details are required
      if (!cartDeliveryDetail) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Cart delivery details not found with cart_id: ${cart_id}`
        )
      }

      // Validate delivery date is today or tomorrow (in IST)
      validateDateIsTodayOrTomorrow(cartDeliveryDetail.delivery_date)

      // Validate end time is in the future (in IST)
      const endDateTime = combineDateAndTime(cartDeliveryDetail.delivery_date, cartDeliveryDetail.end_time)
      validateDateTimeIsInFuture(endDateTime)


      // VALIDATE SLOT CAPACITY FOR SLOTTED DELIVERY
      // This validation happens at the start of order placement workflow
      if (cartDeliveryDetail.slot_id) {
        const { data: slots } = await query.graph({
          entity: 'slot_override',
          filters: {
            id: cartDeliveryDetail.slot_id,
            deleted_at: { $eq: null }
          },
          fields: ['id', 'remaining_capacity', 'is_active']
        })

        if (!slots || slots.length === 0) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Selected delivery slot is no longer available`
          )
        }

        const slot = slots[0]

        // Check if slot is still active
        if (!slot.is_active) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            'Selected delivery slot is no longer active. Please select another slot.'
          )
        }

        // Check if slot still has remaining capacity
        if (slot.remaining_capacity <= 0) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            'Selected delivery slot is fully booked. Please select another slot.'
          )
        }
      }

      // Create order delivery info with the same data
      const createdDeliveryDetail = await orderDeliveryInfoService.createOrderDeliveryDetails({
        order_set_id,
        delivery_type: cartDeliveryDetail.delivery_type,
        delivery_date: cartDeliveryDetail.delivery_date,
        start_time: cartDeliveryDetail.start_time,
        end_time: cartDeliveryDetail.end_time,
        slot_id: cartDeliveryDetail.slot_id // Copy slot_id for slotted deliveries
      })

      // Return the created record ID for rollback
      return new StepResponse(input, createdDeliveryDetail.id)

    } catch (error) {
      console.error('Error copying cart delivery info to order:', error)
      throw error // Re-throw to trigger workflow rollback
    }
  },
  // Compensation function for rollback
  async (createdDeliveryDetailId: string | null, { container }) => {
    if (!createdDeliveryDetailId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Order delivery detail ID is required for compensation'
      )
    }

    try {
      const orderDeliveryInfoService = container.resolve<OrderDeliveryDetailService>(ORDER_DELIVERY_DETAIL_MODULE)

      // Delete the created delivery detail record
      await orderDeliveryInfoService.softDeleteOrderDeliveryDetails([createdDeliveryDetailId])

    } catch (error) {
      console.error('Error during rollback of order delivery detail:', error)
      // Don't throw here to avoid masking the original error
    }
  }
)
