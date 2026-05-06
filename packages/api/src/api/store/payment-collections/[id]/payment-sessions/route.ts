import { createPaymentSessionsWorkflow } from "@medusajs/medusa/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { refetchPaymentCollection } from "../../helpers"
import { HttpTypes } from "@medusajs/framework/types"
import { splitAndCompleteCartWorkflow } from '../../../../../workflows/cart/workflows'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { CustomErrorResponse, getCustomCartErrorResponse } from '../../../carts/utils/validate-cart'
import { CartErrorStatusName } from '../../../../../utils/constants/error_status_code'

interface ErrorResponse {
  type: string
  message: string
  details?: string
}

export const POST = async (
  req: AuthenticatedMedusaRequest<
    HttpTypes.StoreInitializePaymentSession,
    HttpTypes.SelectParams
  >,
  res: MedusaResponse<HttpTypes.StorePaymentCollectionResponse | ErrorResponse | CustomErrorResponse>
) => {
  const collectionId = req.params.id
  const { provider_id } = req.body

  const customerId = req.auth_context?.actor_id

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: cartPaymentCollection } = await query.graph({
    entity: 'cart_payment_collection',
    fields: ['id', 'cart_id'],
    filters: { payment_collection_id: collectionId },
  })

  const data = {
    cart_id: cartPaymentCollection[0].cart_id || '',
  }

  if (!customerId) {
    const message = `Unauthorized request., Please login again.`
    const response = getCustomCartErrorResponse({
      cartId: data.cart_id,
      status: CartErrorStatusName.UNAUTHORIZED_USER,
      message: message
    })

    return res.status(401).json(response)
  }

  const workflowInput = {
    payment_collection_id: collectionId,
    provider_id: provider_id,
    customer_id: req.auth_context?.actor_id,
    data,
  }

  await createPaymentSessionsWorkflow(req.scope).run({
    input: workflowInput,
  })

  const paymentCollection = await refetchPaymentCollection(
    collectionId,
    req.scope,
    req.queryConfig.fields
  )

  if (paymentCollection.payment_sessions && paymentCollection.payment_sessions[0].provider_id === 'pp_razorpay_razorpay') {

    const cart_id = paymentCollection.payment_sessions[0].data.cart_id as string
    try {
      const workflowResult = await splitAndCompleteCartWorkflow(req.scope).run({
        input: {
          id: cart_id,
        },
        context: { transactionId: cart_id }
      })

      // result = workflowResult.result
    } catch (error) {
      console.error(`Cart Id:${cart_id}, completion workflow failed on payment session creation:`, error)

      // Handle specific inventory allocation errors
      if (error.message?.includes('Insufficient inventory')) {
        console.error(`Cart Id:${cart_id}, insufficient inventory`)
        console.dir(error.message)

        const response = getCustomCartErrorResponse({
          cartId: cart_id,
          status: CartErrorStatusName.INSUFFICIENT_INVENTORY,
          message: 'Failed to complete cart order. Insufficient inventory.'
        })

        return res.status(400).json(response)
      }

      // Handle workflow data flow errors
      if (error.message?.includes('Missing location allocations')) {
        console.error(`Cart Id:${cart_id}, internal error, location allocation is missing`)
        console.dir(error.message)

        const response = getCustomCartErrorResponse({
          cartId: cart_id,
          status: CartErrorStatusName.SOMETHING_WENT_WRONG,
          message: 'Internal error occur while processing your order. Please try again.'
        })

        return res.status(400).json(response)
      }

      if (error.message?.includes('No order location mappings')) {
        console.error(`Cart Id:${cart_id}, internal error, No order location mappings`)
        console.dir(error.message)

        const response = getCustomCartErrorResponse({
          cartId: cart_id,
          status: CartErrorStatusName.SOMETHING_WENT_WRONG,
          message: 'Internal error occur while processing your order. Please try again.'
        })

        return res.status(400).json(response)
      }

      // Handle other workflow errors
      return res.status(500).json({
        type: 'workflow_error',
        message: 'Failed to complete cart order. Please try again.',
        details: error instanceof Error ? error.message : String(error)
      } satisfies ErrorResponse)
    }
  }

  res.status(200).json({
    payment_collection: paymentCollection as HttpTypes.StorePaymentCollection,
  })
}
