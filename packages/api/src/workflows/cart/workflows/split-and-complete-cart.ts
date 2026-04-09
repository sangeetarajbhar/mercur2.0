import { MathBN, Modules, OrderWorkflowEvents } from '@medusajs/framework/utils'
import { parallelize, transform, when } from '@medusajs/framework/workflows-sdk'
import {
  authorizePaymentSessionStep,
  createOrdersStep,
  createRemoteLinkStep,
  emitEventStep,
  reserveInventoryStep,
  updateCartsStep,
  useRemoteQueryStep,
  validateCartPaymentsStep
} from '@medusajs/medusa/core-flows'
import { updateDeliveryDetailToOrderStep } from '../steps/update-delivery-detail-to-order'
// import { UsageComputedActions } from '@medusajs/types'
// import { CartWorkflowDTO } from '@medusajs/types/dist/cart'
import {
  WorkflowResponse,
  createHook,
  createWorkflow
} from '@medusajs/framework/workflows-sdk'

// import { OrderSetWorkflowEvents } from '@mercurjs/framework'
// import { MARKETPLACE_MODULE } from '@mercurjs/marketplace'
const MARKETPLACE_MODULE = 'marketplace'
const OrderSetWorkflowEvents = { PLACED: 'order-set.placed' }
type UsageComputedActions = any
type CartWorkflowDTO = any

import { registerUsageStep } from '../../promotions/steps'
// import { createSplitOrderPaymentsStep } from '../../split-order-payment/steps'
import {
  addDefaultShippingMethodsStep,
  associateSellerOrdersStep,
  // completeCartImmediatelyStep,
  createOrderSetStep,
  validateCartSellersStep,
  validateCartShippingOptionsStep
} from '../steps'
import { validateCartPromotionsStep } from '../steps/validate-cart-promotions-step'
import { validateCartTierPromotionsStep } from '../../tier/steps/validate-cart-tier-promotions'
import { validateCartDeliveryDataStep } from '../steps/validate-cart-delivery-data'
import { decrementSlotCapacityStep } from '../steps/decrement-slot-capacity'
// import { sendToSQSStep } from '../steps/send-to-sqs'
import { prepareOrdersForCreationStep } from '../steps/prepare-orders-for-creation'
import { completeCartFields } from '../utils'
import { mapCartItemsToLocationStep } from '../steps/map-cart-items-to-location'
import { storeOrderLocationsStep } from '../steps/store-order-locations'
import { storeOrderLineItemExtensionData } from '../steps/store-order-line-item-extension-data'
import { updateCartOrderExtraChargeStep } from '../steps/update-cart-order-extra-charge'
// import { compensatePaymentIfNeededStep } from '../../payment/steps'
const createSplitOrderPaymentsStep = (_input: any) => transform({}, () => undefined as any)
const compensatePaymentIfNeededStep = (_input: any) => transform({}, () => undefined as any)
/**
 * Input type for the split and complete cart workflow
 * Accepts a cart ID to be processed
 */
type SplitAndCompleteCartWorkflowInput = {
  id: string
  // payment_type?: 'online_payment' | 'cod'  // Payment type (default: 'cod')
}

export const splitAndCompleteCartWorkflowId = "split-and-complete-cart"
/**
 * Workflow to split and complete the cart.
 * It validates the cart, authorizes payment, associates sellers,
 * creates orders, and emits necessary events.
 */
export const splitAndCompleteCartWorkflow = createWorkflow(
  {
    name: splitAndCompleteCartWorkflowId,
    idempotent: true
  },
  function (input: SplitAndCompleteCartWorkflowInput) {
    const existingOrderSet = useRemoteQueryStep({
      entry_point: 'order_set',
      fields: ['id', 'cart_id'],
      variables: {
        filters: {
          cart_id: input.id
        }
      },
      list: false
    }).config({ name: 'order-set-query' })

    const orderSetResult = when(
      'check-existing-order-set',
      { existingOrderSet },
      ({ existingOrderSet }) => {
        return !existingOrderSet
      }
    ).then(() => {
      const cart = useRemoteQueryStep({
        entry_point: 'cart',
        fields: completeCartFields,
        variables: {
          id: input.id
        },
        list: false
      }).config({ name: 'cart-query' })

      // Log cart payment collection info for debugging
      // Add default shipping methods if none exist
      // addDefaultShippingMethodsStep(
      //   transform({ cart }, ({ cart }) => ({ cart_id: cart.id }))
      // )
      transform({ cart }, ({ cart }) => {
        if (cart.completed_at) {
          throw new Error(
            `Cart ${cart.id} is already completed. This may be from a previous checkout attempt. ` +
            `Please create a new cart to retry checkout.`
          )
        }
        return cart
      })

      const { addedShippingMethods } = addDefaultShippingMethodsStep(
        transform({ cart }, ({ cart }) => ({ cart_id: cart.id }))
      )

      // Validate cart promotions before proceeding with checkout
      // This ensures no invalid promotions are processed
      validateCartPromotionsStep(
        transform({ cart }, ({ cart }) => ({ cart }))
      )

      // Validate tier promotions before proceeding with checkout
      // This ensures customers can't complete checkout with wrong-tier promotions
      validateCartTierPromotionsStep(
        transform({ cart }, ({ cart }) => ({ cart }))
      )
      validateCartDeliveryDataStep(
        transform({ cart }, ({ cart }) => ({
          cart_id: cart.id,
          cart: {
            id: cart.id,
            shipping_address: cart.shipping_address,
            items: cart.items
          },
          requireDeliveryData: true // Require delivery data for order creation
        }))
      )

      // return {
      //   cart,
      //   addedShippingMethods
      // }

      validateCartSellersStep(
        transform({ cart }, ({ cart }) => ({
          line_items: cart.items
        }))
      )

      // const validateCartShippingOptionsInput = transform(
      //   { cart },
      //   ({ cart }) => ({
      //     cart_id: cart.id,
      //     option_ids: cart.shipping_methods.map(
      //       (method) => method.shipping_option_id
      //     )
      //   })
      // )

      const validateCartShippingOptionsInput = transform(
        { cart, addedShippingMethods },
        ({ cart, addedShippingMethods }) => ({
          cart_id: cart.id,
          option_ids: addedShippingMethods.map(
            (method) => method.shipping_option_id
          )
        })
      )

      const { sellerProducts, sellerShippingOptions } =
        validateCartShippingOptionsStep(validateCartShippingOptionsInput)

      const paymentSessions = validateCartPaymentsStep({ cart })

      // Authorize payment session (works for both online and COD payments)
      //  let payment

      // @TODO for razorpay code is commented for testing
      // const paymentCollectionId = paymentSessions[0]?.payment_collection_id

      // const providerId = paymentSessions[0]?.provider_id

      // // In COD case, authorized the payment
      // // and for razorpay we are placing the order at the time of payment initialize
      // if (providerId === 'pp_system_default') {
      //   authorizePaymentSessionStep({
      //     id: paymentSessions[0].id,
      //     context: { cart_id: cart.id }
      //   })
      // }

      const paymentCollectionId = transform(
        { paymentSessions },
        ({ paymentSessions }) => paymentSessions[0]?.payment_collection_id
      )

      // Get payment provider ID for status determination
      const paymentProviderId = transform(
        { paymentSessions },
        ({ paymentSessions }) => paymentSessions[0]?.provider_id
      )

      // In COD case, authorize the payment
      // and for razorpay we are placing the order at the time of payment initialize
      // Note: We can't use nested 'when' blocks inside '.then()', so we use a transform
      // to conditionally prepare the input. For non-COD payments, we still call the step
      // but it will use the same payment session (which should be fine for razorpay)

      const authorizePaymentInput = transform(
        { paymentSessions, cart },
        ({ paymentSessions, cart }) => {
          // Only authorize if provider is COD (pp_system_default)
          // For other providers (like razorpay), the payment is already authorized
          if (paymentSessions[0]?.provider_id === 'pp_system_default') {
            return {
              id: paymentSessions[0].id,
              context: { cart_id: cart.id }
            }
          }
          // For non-COD, return the payment session anyway (it may already be authorized)
          // This ensures the step is called but won't cause issues
          return {
            id: null as unknown as string,  // @TODO for other payment providers except COD, authorizePaymentSessionStep will not be called
          }
        }
      )

      // Authorize payment session (only processes COD, others are already handled)
      // authorizePaymentSessionStep(authorizePaymentInput)

      // @TODO for razorpay code is commented for testing
      // const payment = authorizePaymentSessionStep({
      //   id: paymentSessions[0].id,
      //   context: { cart_id: cart.id }
      // })

      // Add payment compensation step - this will automatically refund if anything fails after this point
      compensatePaymentIfNeededStep({
        payment_session_id: paymentSessions[0].id
      })

      // // Complete cart immediately after payment to prevent reuse if order creation fails
      // completeCartImmediatelyStep({
      //   cart_id: cart.id
      // })

      // Map cart items to inventory locations and validate availability
      // This step will throw an error if inventory allocation fails, triggering automatic rollback
      const { cartLineItemWithInventoryLocationData } = mapCartItemsToLocationStep({ cart })

      // const variantSellersData = mapCartItemsToSellersStep({ cart })
      // const { ordersToCreate, sellers, variants } =
      //   prepareOrdersForCreationStep({
      //     cart,
      //     sellerProducts,
      //     sellerShippingOptions,
      //     cartItemToSellerMapping: variantSellersData.cartItemToSellerMapping,
      //     variantToSellerMapping: variantSellersData.variantToSellerMapping
      //   })

      const { ordersToCreate, sellers, variants } =
        prepareOrdersForCreationStep({
          cartLineItemWithInventoryLocationData,
          sellerProducts,
          sellerShippingOptions,
          payment_provider_id: paymentProviderId
        })

      // Register the usage of promotions (using original cart data for now, will be corrected after order creation)
      const promotionUsage = transform(
        { cart },
        ({ cart }: { cart: CartWorkflowDTO }) => {
          const promotionUsage: UsageComputedActions[] = []

          const itemAdjustments = (cart.items ?? [])
            .map((item) => item.adjustments ?? [])
            .flat(1)

          const shippingAdjustments = (cart.shipping_methods ?? [])
            .map((item) => item.adjustments ?? [])
            .flat(1)

          for (const adjustment of itemAdjustments) {
            promotionUsage.push({
              amount: adjustment.amount,
              code: adjustment.code!
            })
          }

          for (const adjustment of shippingAdjustments) {
            promotionUsage.push({
              amount: adjustment.amount,
              code: adjustment.code!
            })
          }

          return promotionUsage
        }
      )

      // Prepare customer context for per-customer budget tracking
      // This allows Medusa to create/update records in promotion_campaign_budget_usage table
      const usageContext = transform(
        { cart },
        ({ cart }: { cart: CartWorkflowDTO }) => {
          return {
            customer_id: cart.customer_id || null,
            customer_email: cart.email || null
          }
        }
      )

      // Register the usage of promotions with customer context
      // For per-customer budgets (usage_per/spend_per), Medusa will track usage per customer
      registerUsageStep({
        usageActions: promotionUsage,
        context: usageContext
      })

      // Step 8: Create an order set to group all the orders
      // @TODO for razorpay code is commented for testing
      // const orderSetPaymentCollectionId = transform(
      //   { payment },
      //   ({ payment }) => {
      //     // Use payment_collection_id from authorized payment
      //     const pcId = payment?.payment_collection_id
      //     return pcId
      //   }
      // )

      const createdOrderSet = createOrderSetStep({
        cart_id: cart.id,
        customer_id: cart.customer_id,
        sales_channel_id: cart.sales_channel_id,
        // payment_collection_id: orderSetPaymentCollectionId, // @TODO for razorpay code is commented for testing
        payment_collection_id: paymentCollectionId,
        payment_provider_id: paymentProviderId,
      })

      // Copy cart delivery info to order delivery info
      updateDeliveryDetailToOrderStep({
        cart_id: cart.id,
        order_set_id: createdOrderSet.id
      })

      const createdOrders = createOrdersStep(ordersToCreate)

      const splitPaymentsToCreate = transform(
        { createdOrders, paymentCollectionId }, // @TODO for razorpay code is commented for testing
        ({ createdOrders, paymentCollectionId }) => { // @TODO for razorpay code is commented for testing
          const payments = createdOrders.map((order) => {
            // Use payment_collection_id from authorized payment
            const pcId = paymentCollectionId // @TODO for razorpay code is commented for testing
            return {
              order_id: order.id,
              status: 'pending',
              currency_code: order.currency_code,
              authorized_amount: MathBN.convert(
                order.summary?.accounting_total || 0
              ).toNumber(),
              payment_collection_id: pcId
            }
          })
          return payments
        }
      )

      // Associate sellers with their respective orders
      associateSellerOrdersStep({
        orders: createdOrders,
        sellers: sellers
      })

      // Store order-location mappings (includes marketplace_order_id)
      // NOTE: Order location data is now stored in order.metadata.order_location_id for processing
      storeOrderLocationsStep({ orders: createdOrders })

      // store order line items extension data
      storeOrderLineItemExtensionData({
        orders: createdOrders,
        order_set_id: createdOrderSet.id,
        payment_provider_id: paymentProviderId,
        payment_collection_id: paymentCollectionId
      })

      updateCartOrderExtraChargeStep({
        cart_id: cart.id,
        order_set_id: createdOrderSet.id
      })

      // Prepare location-specific inventory reservation data
      const formatedInventoryItems = transform(
        { createdOrders, variants },
        ({ createdOrders, variants }) => {
          const items: any[] = []

          for (const order of createdOrders) {
            for (const item of order.items || []) {
              // Get the specific location for this item (cast to any to access location_id)
              const specificLocationId = order.metadata?.order_location_id

              if (!specificLocationId) {
                continue
              }

              // Find the variant to get inventory details
              const variant = variants.find(v => v.id === item.variant_id)
              if (!variant?.manage_inventory) {
                continue
              }

              // Find inventory items for this variant
              const variantInventoryItems = variant.inventory_items || []

              for (const inventoryItem of variantInventoryItems) {
                items.push({
                  id: item.id,
                  inventory_item_id: inventoryItem.inventory_item_id,
                  required_quantity: inventoryItem.required_quantity,
                  allow_backorder: !!variant.allow_backorder,
                  quantity: item.quantity,
                  location_ids: [specificLocationId] // only the specific allocated location
                })
              }
            }
          }

          return { items }
        }
      )

      const links = transform(
        {
          createdOrders,
          sellers,
          orderSet: createdOrderSet,
          cart
        },
        ({ createdOrders, orderSet, cart }) => {
          const orderSetOrderLinks = createdOrders.map((order) => ({
            [MARKETPLACE_MODULE]: {
              order_set_id: orderSet.id
            },
            [Modules.ORDER]: {
              order_id: order.id
            }
          }))

          const orderPaymentLinks = createdOrders.map((order) => ({
            [Modules.ORDER]: {
              order_id: order.id
            },
            [Modules.PAYMENT]: {
              payment_collection_id: cart.payment_collection.id
            }
          }))

          return [
            ...orderSetOrderLinks,
            ...orderPaymentLinks
          ]
        }
      )

      const orderEvents = transform({ createdOrders }, ({ createdOrders }) => ({
        eventName: OrderWorkflowEvents.PLACED,
        data: createdOrders.map((order) => ({
          id: order.id
        }))
      }))

      // Cart already completed immediately after payment - no need to update again
      const updateCartInput = transform({ cart }, ({ cart }) => ({
        id: cart.id,
        completed_at: new Date()
      }))

      // Prepare SQS messages from order extra details
      // const sqsMessages = transform(
      // { orderExtraDetails },
      // ({ orderExtraDetails }) => {
      //   return orderExtraDetails.map((detail) => ({
      //     body: {
      //       operation: 'createOrder',
      //       marketplaceOrderId: detail.marketplace_order_id,
      //     } as Record<string, any>,

      parallelize(
        createSplitOrderPaymentsStep(splitPaymentsToCreate),
        createRemoteLinkStep(links),
        reserveInventoryStep(formatedInventoryItems),
        updateCartsStep([updateCartInput]),
        emitEventStep(orderEvents),
        emitEventStep({
          eventName: OrderSetWorkflowEvents.PLACED,
          data: {
            id: createdOrderSet.id
          }
        }).config({ name: 'order-set-event' }),
        // Decrement slot capacity for slotted deliveries
        decrementSlotCapacityStep({
          order_set_id: createdOrderSet.id
        }),
        // Send orders to SQS queue
        // sendToSQSStep({
        //   messages: sqsMessages,
        //   queueUrl: process.env.AWS_SQS_ORDER_QUEUE_URL
        // })
      )

      // Authorize payment session (only processes COD, others are already handled)
      // session will be set after autherize is captured by the payment provider after the order is created
      authorizePaymentSessionStep(authorizePaymentInput) // @TODO for testing commenting below code to test razorpay use case

      // if authorizePaymentInput.id is not null then sendToSQSStep, it means it is COD payment
      // const checkAuthorizePaymentInput = authorizePaymentInput.id
      // if (checkAuthorizePaymentInput) {
      // It should work only in case of systems_default

      // authorizePaymentSessionStep(authorizePaymentInput)

      // @TODO for testing commenting below code to test razorpay use case
      // @TODO moving SQS into notification of COD
      // sendToSQSStep({
      //   messages: sqsMessages,
      //   queueUrl: process.env.AWS_SQS_ORDER_QUEUE_URL
      // })
      // }

      // return orderSet
      return { orderSet: createdOrderSet, existingOrderSet }
    })

    // return {orderSet:"orderSetResult", orderSetResult};
    // Step 16: Handle the final response, whether an existing order set was found or a new one was created
    // Cast the orderSet to any to work around TypeScript error while keeping original logic
    // Create a hook to notify that an order set was created or retrieved
    const orderSetCreatedHook = createHook('orderSetCreated', { orderSetResult })

    // Return a consistent response format with the order set ID and the hook
    return new WorkflowResponse(
      { id: orderSetResult?.orderSet?.id ?? existingOrderSet?.id },
      {
        hooks: [orderSetCreatedHook]
      }
    )
  }
)
