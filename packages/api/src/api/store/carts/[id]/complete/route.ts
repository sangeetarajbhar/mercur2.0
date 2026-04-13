import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'

import { splitAndCompleteCartWorkflow } from '../../../../../workflows/cart/workflows/split-and-complete-cart'
import { getFormattedOrderSetListWorkflow } from '../../../../../workflows/order-set/workflows/get-formatted-order-set-list'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { getPaymentMethod } from '../../../../../utils/constants/payments'
import { getLatestByCreatedAt } from '../../../../admin/seller-orders/utils'
// import { defaultStoreRetrieveOrderSetFields } from '../../../order-set/query-config'

interface OrderSetWithPaymentMethod {
  [key: string]: any
  payment_collection?: {
    payments?: any[]
  }
  payment_method?: string
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const cart_id = req.params.id

  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({
      message: 'Unauthorized',
    })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Ensure the cart belongs to the authenticated customer before proceeding
  const { data: carts } = await query.graph({
    entity: 'cart',
    fields: ['id'],
    filters: {
      id: cart_id,
      customer_id: customerId,
    },
  })

  if (!carts.length) {
    return res.status(404).json({
      message: 'Cart not found',
    })
  }

  const { data: deliveryDetail } = await query.graph({
    entity: 'cart_delivery_detail',
    fields: ['id', 'delivery_type', 'delivery_date', 'start_time', 'end_time', 'slot_id'],
    filters: {
      cart_id: cart_id,
      deleted_at: { $eq: null }
    }
  })

  if (!deliveryDetail.length) {
    return res.status(400).json({
      message: "Cart delivery detail not found can't complete cart"
    })
  }

  let result
  try {
    const workflowResult = await splitAndCompleteCartWorkflow(req.scope).run({
      input: {
        id: cart_id,
      },
      context: { transactionId: cart_id }
    })

    result = workflowResult.result
  } catch (error) {
    console.error('Cart completion workflow failed:', error)

    // Handle specific inventory allocation errors
    if (error.message?.includes('Insufficient inventory')) {
      return res.status(400).json({
        type: 'insufficient_inventory',
        message: 'Failed to complete cart order. Please try again.',
        details: error.message
      })
    }

    // Handle workflow data flow errors
    if (error.message?.includes('Missing location allocations')) {
      return res.status(500).json({
        type: 'workflow_data_error',
        message: 'Internal error processing your order. Please try again.',
        details: 'Workflow data flow issue detected'
      })
    }

    if (error.message?.includes('No order location mappings')) {
      return res.status(500).json({
        type: 'workflow_data_error',
        message: 'Internal error processing your order. Please try again.',
        details: 'No order location mappings to store'
      })
    }

    // Handle other workflow errors
    return res.status(500).json({
      type: 'workflow_error',
      message: 'Failed to complete cart order. Please try again.',
      details: error.message
    })
  }

  const {
    result: { data }
  } = await getFormattedOrderSetListWorkflow(req.scope).run({
    input: {
      filters: { id: result.id },
      fields: [
        'payment_collection.payments.*',
        // Include seller details for each order in the order_set
        'orders.seller.id',
        'orders.seller.name',
        'orders.items.variant.product.brand.*',
        'orders.items.variant.product.categories.*'
      ]
    }
  })

  const orderSet = data[0] as OrderSetWithPaymentMethod

  const latestPayment = getLatestByCreatedAt(
    (orderSet.payment_collection as any)?.payments as any[]
  )

  if (latestPayment) {
    orderSet.payment_method = getPaymentMethod(latestPayment.provider_id)
  }

  if (deliveryDetail.length > 0) {
    orderSet.delivery_detail = deliveryDetail[0]
  }
  res.json({
    order_set: orderSet
  })
}
