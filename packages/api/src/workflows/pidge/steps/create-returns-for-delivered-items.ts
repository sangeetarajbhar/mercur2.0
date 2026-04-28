import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { MedusaError } from '@medusajs/framework/utils'
import { createAndCompleteReturnOrderWithFlagUpdateWorkflow } from '../../../workflows/returns/workflows/create-and-complete-return-order-with-flag-update'
import { addReturnAddressWorkflow } from '../../returns/returns'
import { beginReceiveReturnWorkflow, receiveItemReturnRequestWorkflow } from '@medusajs/medusa/core-flows'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { confirmReceiveReturnWorkflow } from '../../returns/workflows/confirm-receive-return'
import { refundSplitOrderPaymentWorkflow } from '../../split-order-payment/workflows'
import { updateShipmentStatusWorkflow } from '../../shipment-status/workflows'
import { createRefundOrderLineItemLinksWorkflow } from '../../payment/workflows/create-refund-order-line-item-links'
import { updateReturnRefundStatusWorkflow } from '../../returns/update-return-refund-status'
import OrderLineItemExtensionModuleService from '../../../modules/order-line-item-extension/service'
import { ORDER_LINE_ITEM_EXTENSION_MODULE } from '../../../modules/order-line-item-extension'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'
import { Modules } from '@medusajs/framework/utils'
import { getOrderReturnLocationIds } from '../../../api/utils/get-order-return-location-ids'

export type CreateReturnsForDeliveredItemsInput = {
  lineItemId: string[]
  orderId: string
}

export const createReturnsForDeliveredItemsStep = createStep(
  'create-returns-for-delivered-items',
  async (input: CreateReturnsForDeliveredItemsInput, { container }) => {
    const { lineItemId, orderId } = input

    if(lineItemId.length === 0){
      return new StepResponse({
        processed: false,
        message: 'No line items to process',
        returns: []
      })
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Validate inputs
    if (!Array.isArray(lineItemId) || lineItemId.length === 0) {
      return new StepResponse({
        processed: false,
        message: 'No line items to process',
        returns: []
      })
    }

    if (!orderId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'orderId is required to create return orders'
      )
    }

    const results = [] as any[]

    // Get return reason with value "try_and_buy" using query.graph
    const { data: returnReasons } = await query.graph({
      entity: 'return_reason',
      fields: ['id', 'value', 'label'],
      filters: {
        value: 'try_and_buy'
      }
    })

    const tryAndBuyReason = returnReasons?.[0]

    if (!tryAndBuyReason) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        'Return reason with value "try_and_buy" not found'
      )
    }

    const { return_location_id } = await getOrderReturnLocationIds(query, orderId)

    // Process each line item
    for (const item of lineItemId) {
      try {
        const returnData = {
          order_id: orderId,
          location_id: return_location_id,
          items: [{
            id: item,
            quantity: 1,
            reason_id: tryAndBuyReason.id
          }],
          return_shipping: {
            option_id: null
          }
        }

        const { data: [order] } = await query.graph({
          entity: 'order',
          fields: [
            'shipping_methods.*', 'items.order_line_item_extension.*', 'items.adjustments.*', 'payment_collections.payment_sessions.*', 'payment_collections.payment_sessions.payment.*' ,'split_order_payment.*'
          ],
          filters: {
            id: orderId,
            items: {
              id: item
            }
          }
        })

        // Find the item object with id that equals item
        const orderItem = order?.items?.find((orderItem: any) => orderItem.id === item)
      
        if (!order && order.length === 0) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            `Order with id ${returnData.order_id} not found`
          )
        }
      
        // Find shipping_method where detail.return_id is null
        const shippingMethod = order.shipping_methods?.find((method: any) => 
          method.detail?.return_id === null || method.detail?.return_id === undefined
        )
      
        if (!shippingMethod) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            'No shipping method found'
          )
        }
      
        const shippingOptionId = shippingMethod?.shipping_option_id
      
        if(!shippingOptionId){
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            'No shipping option found'
          )
        }
      
        returnData.return_shipping = {
          option_id : shippingOptionId
        }

        // Create and complete return order
        const { result: returnResult } = await createAndCompleteReturnOrderWithFlagUpdateWorkflow.run({
          container,
          input: returnData
        })

        if (!returnResult) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            `Failed to create return order for line item ${item}`
          )
        }

        const eventBus = container.resolve(Modules.EVENT_BUS)
        
        await eventBus.emit({
          name: "return_created",
          data: {
            order_id: orderId,
            items: [{id:item}],
          }
        })        
        // Update order line item extension status
        const orderLineItemExtensionService = container.resolve(ORDER_LINE_ITEM_EXTENSION_MODULE) as OrderLineItemExtensionModuleService

        await orderLineItemExtensionService.updateOrderLineItemExtensions({
          selector: { order_line_item_id: item },
          data: {
            returnable_flag: false,
            status: OrderLineItemStatus.RETURNED_REQUESTED,
          }
        })

        // Extract location ID from return order metadata
        let locationId: string | undefined = undefined
        if (returnResult.order && returnResult.order.metadata && returnResult.order.metadata.order_location_id) {
          locationId = returnResult.order.metadata.order_location_id as string
        } else {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            `Location ID not found for return order ${returnResult.id}`
          )
        }
        // Add return address
        await addReturnAddressWorkflow(container).run({
          container,
          input: {
            locationId,
            returnId: returnResult.id
          }
        })

        await beginReceiveReturnWorkflow(container).run({
         input: {
           return_id: returnResult.id,
         },
       })

       const input = { items: [{id:item, quantity:1}], return_id: returnResult.id }

        await receiveItemReturnRequestWorkflow(container).run({input})

        await confirmReceiveReturnWorkflow(container).run({
          input: {
            return_id: returnResult.id,
            confirmed_by: 'system'
          }
        })

        await eventBus.emit({
          name: 'return_items_received',
          data: {
            return_id: returnResult.id,
          }
        })

        console.log(order?.payment_collections[0]?.payment_sessions, `payment Sessions for order`)

        if(order?.payment_collections[0]?.payment_sessions[0]?.provider_id !== 'pp_system_default'){
          if(orderItem?.order_line_item_extension?.item_total){
          await refundSplitOrderPaymentWorkflow(container).run({
            input: {
              id: order.split_order_payment.id,
              amount: orderItem?.order_line_item_extension?.item_total
            }
          })

            await createRefundOrderLineItemLinksWorkflow(container).run({
              input: {
                payment_id: order?.payment_collections[0]?.payment_sessions[0]?.payment?.id,
                order_line_item_id: item,
                amount: orderItem?.order_line_item_extension?.item_total
                // refunds array not needed - workflow will fetch it automatically
              }
            })
        
          // Step 3: Update return status to refunded
          await updateReturnRefundStatusWorkflow(container).run({
            input: {
              returnId: returnResult.id,
              updated_by: 'system',
            //   internal_note,
            },
          })

          }else{
            console.log('No amount to refund for line item', item)
          }
        }
        

        results.push({
          lineItemId: item,
          returnId: returnResult.id,
          locationId,
          success: true
        })
      } catch (error: any) {
        // Log error but continue with next item
        console.error(`Error processing return/refund for line item ${item} in order ${orderId}:`, {
          lineItemId: item,
          orderId: orderId,
          error: error.message || error,
          errorType: error.type || error.constructor?.name || 'Unknown',
          stack: error.stack
        })
        
        // Add error result to track failed items
        results.push({
          lineItemId: item,
          success: false,
          error: error.message || String(error),
          errorType: error.type || error.constructor?.name || 'Unknown'
        })
        
        // Continue with next item instead of throwing
        continue
      }
    }

    return new StepResponse({
      processed: true,
      returns: results,
      message: `Successfully created ${results.length} return order(s)`
    })
  },
  async (result: any, { container }) => {
    // Compensation logic - if needed, we could delete the created returns
    console.log('Compensating create-returns-for-delivered-items:', result)
  }
)

