import {
  WorkflowResponse,
  createWorkflow,
  when,
  transform
} from '@medusajs/framework/workflows-sdk'
import {
  createOrderShipmentWorkflow,
  markOrderFulfillmentAsDeliveredWorkflow
} from '@medusajs/medusa/core-flows'

import {
  validateShipmentStatusUpdateStep,
  updateLineItemsFromShipmentStep,
  captureCodPaymentOnDeliveryStep,
  updateLineItemsReturnableFlagStep
} from '../steps'
import { ShipmentStatus } from '../../../utils/constants/order-statuses'
import { updateOrderSetStatusStep } from '../../order-set/steps/update-order-set-status'
import { updateOrderSetRiderAssignmentStep } from '../../order-set/steps/update-order-set-rider-assignment'
import { updateOrderSetMetadataStep } from '../../order-set/steps/update-order-set-metadata'
import { updateOrderStatusStep } from '../../order-status/steps/update-order-status'
import { sendToSQSStep } from '../../cart/steps/send-to-sqs'
import { useQueryGraphStep } from '@medusajs/medusa/core-flows'
import sellerOrder from '@mercurjs/core-plugin/links/order-seller-link'

interface UpdateShipmentStatusInput {
  shipmentId: string
  status: string
  metadata?: Record<string, unknown>
}

export const updateShipmentStatusWorkflow = createWorkflow(
  'update-shipment-status',
  function (input: UpdateShipmentStatusInput) {
      // Step 1: Validate the shipment status update request
      const validationResult = validateShipmentStatusUpdateStep({
        shipmentId: input.shipmentId,
        status: input.status
      })

    const orderIdRef = transform(validationResult, (data) => data.orderId)
    // const orderSetIdRef = transform(validationResult, (data) => data.orderSetId)
    const skipStatusUpdateRef = transform(validationResult, (data) => data.skipStatusUpdate ?? false)
    const shipmentItemsRef = transform(validationResult, (data) =>
      data.shipments.map((shipment) => ({
        id: shipment.order_line_item_id,
        quantity: 1
      }))
    )

    when(
      {
        status: transform(validationResult, (data) => data.status),
        skipStatusUpdate: skipStatusUpdateRef
      },
      ({ status, skipStatusUpdate }) => !skipStatusUpdate && status === ShipmentStatus.RIDER_ASSIGNED
    ).then(() => {
      updateOrderSetRiderAssignmentStep(
        transform(
          {
            validationResult,
            metadata: input.metadata
          },
          ({ validationResult, metadata }) => ({
            orderSetId: validationResult.orderSetId,
            metadata: (metadata ?? {}) as Record<string, unknown>
          })
        )
      )
    })

    // Step 2: If status is SHIPPED, invoke Medusa's createOrderShipmentWorkflow and update metadata
    const shipmentCreated = when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, skipStatusUpdate }) => !skipStatusUpdate && status === ShipmentStatus.SHIPPED
    ).then(() => {
      // Update order_set metadata by merging with existing metadata
      updateOrderSetMetadataStep(
        transform(
          {
            validationResult,
            metadata: input.metadata
          },
          ({ validationResult, metadata }) => ({
            orderSetId: validationResult.orderSetId,
            metadata: (metadata ?? {}) as Record<string, unknown>
          })
        )
      )

      return createOrderShipmentWorkflow.runAsStep({
        input: {
          order_id: orderIdRef,
          fulfillment_id: input.shipmentId,
          items: shipmentItemsRef
        }
      })
    })

    // Step 3: If status is DELIVERED, invoke Medusa's markOrderFulfillmentAsDeliveredWorkflow
    const shipmentDelivered = when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, skipStatusUpdate }) => !skipStatusUpdate && status === ShipmentStatus.DELIVERED
    ).then(() => {
      return markOrderFulfillmentAsDeliveredWorkflow.runAsStep({
        input: {
          orderId: orderIdRef,
          fulfillmentId: input.shipmentId
        }
      })
    })

    // Step 4 & 5 (when/then): Update line items, order status, and order-set status for SHIPPED or DELIVERED
    when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, skipStatusUpdate }) =>
        !skipStatusUpdate && (status === ShipmentStatus.SHIPPED ||
        status === ShipmentStatus.DELIVERED)
    ).then(() => {
      updateLineItemsFromShipmentStep({
        shipments: validationResult.shipments,
        status: input.status
      })

      updateOrderStatusStep(
        transform(orderIdRef, (orderId) => ({
          orderIds: orderId ? [orderId] : []
        }))
      )

      updateOrderSetStatusStep(
        transform(orderIdRef, (orderId) => ({
          orderIds: orderId ? [orderId] : []
        }))
      )
    })

    when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, skipStatusUpdate }) => !skipStatusUpdate && status === ShipmentStatus.DELIVERED
    ).then(() => {
      updateLineItemsReturnableFlagStep(
        transform(
          {
            validationResult,
            shipmentId: input.shipmentId,
            status: input.status
          },
          ({ validationResult, shipmentId, status }) => ({
            orderSetId: validationResult.orderSetId,
            shipmentId,
            shipments: validationResult.shipments,
            status
          })
        )
      )
    })

    // Step 6: If status is DELIVERED, capture COD payment for the shipment line items
    when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, skipStatusUpdate }) => !skipStatusUpdate && status === ShipmentStatus.DELIVERED
    ).then(() => {
      captureCodPaymentOnDeliveryStep(
        transform(
          {
            validationResult,
            status: input.status
          },
          ({ validationResult, status }) => ({
            orderId: validationResult.orderId,
            orderSetId: validationResult.orderSetId,
            status,
            shipmentLineItems: validationResult.shipments
          })
        )
      )
    })

    // return new WorkflowResponse({dsads:"dsads"})

    // Step 7: Send SQS message for SHIPPED status
    when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, skipStatusUpdate }) => !skipStatusUpdate && status === ShipmentStatus.SHIPPED
    ).then(() => {
      const fulfillmentData = useQueryGraphStep({
        entity: 'fulfillment',
        fields: ['id', 'shipped_at'],
        filters: {
          id: input.shipmentId
        }
      }).config({ name: 'query-fulfillment-shipped' })

      const sellerLinkQuery = useQueryGraphStep({
        entity: sellerOrder.entryPoint,
        fields: ['seller_id'],
        filters: {
          order_id: orderIdRef
        }
      }).config({ name: 'query-order-seller-link-shipped' })
      const shipmentQueueUrl =
        process.env.AWS_SQS_SHIPMENT_QUEUE_URL 

      const sqsMessages = transform(
        { fulfillmentData :fulfillmentData as any, sellerLinkQuery :sellerLinkQuery as any },
        ({ fulfillmentData, sellerLinkQuery }) => {
          const fulfillment = fulfillmentData.data[0]
          const sellerLink = sellerLinkQuery?.data?.[0] ?? null
          const sellerId = sellerLink?.seller_id ?? null

          const attributes: Record<string, string> = {
            operation: 'updateOrder',
            orderEvent: 'shipped',
            shipmentId: fulfillment.id
          }

          if (sellerId) {
            attributes.sellerId = sellerId
          }

          const message = {
            body: {
              operation: 'updateOrder',
              orderEvent: 'shipped',
              shippedAt: fulfillment.shipped_at,
              shipmentId: fulfillment.id,
              sellerId: sellerId ?? null
            } as Record<string, any>,
            attributes
          }

          return [message]
        }
      )
      return sendToSQSStep({
        messages: sqsMessages,
        queueUrl: shipmentQueueUrl
      }).config({ name: 'send-sqs-shipped' })
    })

    // Step 8: Send SQS message for DELIVERED status
    when(
      { status: input.status, skipStatusUpdate: skipStatusUpdateRef },
      ({ status, skipStatusUpdate }) => !skipStatusUpdate && status === ShipmentStatus.DELIVERED
    ).then(() => {
      const fulfillmentData = useQueryGraphStep({
        entity: 'fulfillment',
        fields: ['id', 'delivered_at'],
        filters: {
          id: input.shipmentId
        }
      }).config({ name: 'query-fulfillment-delivered' })

      const sellerLinkQuery = useQueryGraphStep({
        entity: sellerOrder.entryPoint,
        fields: ['seller_id'],
        filters: {
          order_id: orderIdRef
        }
      }).config({ name: 'query-order-seller-link-delivered' })
      const shipmentQueueUrl =
        process.env.AWS_SQS_SHIPMENT_QUEUE_URL 

      const sqsMessages = transform(
        { fulfillmentData :fulfillmentData as any, sellerLinkQuery :sellerLinkQuery as any },
        ({ fulfillmentData, sellerLinkQuery }) => {
          const fulfillment = fulfillmentData.data[0]
          const sellerLink = sellerLinkQuery?.data?.[0] ?? null
          const sellerId = sellerLink?.seller_id ?? null

          const attributes: Record<string, string> = {
            operation: 'updateOrder',
            orderEvent: 'delivered',
            shipmentId: fulfillment.id
          }

          if (sellerId) {
            attributes.sellerId = sellerId
          }

          const message = {
            body: {
              operation: 'updateOrder',
              orderEvent: 'delivered',
              deliveredAt: fulfillment.delivered_at,
              shipmentId: fulfillment.id,
              sellerId: sellerId ?? null
            } as Record<string, any>,
            attributes
          }

          return [message]
        }
      )

      return sendToSQSStep({
        messages: sqsMessages,
        queueUrl: shipmentQueueUrl
      }).config({ name: 'send-sqs-delivered' })
    })

      return new WorkflowResponse({
        status: input.status,
        shipmentCreated,
        shipmentDelivered
      })
    }
)

