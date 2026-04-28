import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import {
  ShipmentStatus,
  VALID_STATUS_TRANSITIONS
} from '../../../utils/constants/order-statuses'

interface ValidateShipmentStatusUpdateInput {
  shipmentId: string
  status: string
}

interface ValidationResult {
  orderId: string
  orderSetId: string | null
  riderAssignedAt: string | Date | null
  shipments: Array<{
    shipment_id: string
    order_line_item_id: string
    currentStatus: string
  }>
  status: string
  skipStatusUpdate?: boolean
}

export const validateShipmentStatusUpdateStep = createStep(
  'validate-shipment-status-update',
  async (input: ValidateShipmentStatusUpdateInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // 1. Resolve the order using the order_fulfillment table
    const { data: orderFulfillments } = await query.graph({
      entity: 'order_fulfillment',
      fields: ['order_id', 'fulfillment_id'],
      filters: {
        fulfillment_id: input.shipmentId
      }
    })

    if (!orderFulfillments || orderFulfillments.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Shipment with ID ${input.shipmentId} not found`
      )
    }

    const orderId = orderFulfillments[0].order_id

    // 2. Resolve the order_set relationship for validation and rider checks
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: ['id', 'order_set.id', 'order_set.rider_assigned_at'],
      filters: {
        id: orderId
      }
    })

    const order = orders?.[0] ?? null
    const orderSetId = order?.order_set?.id ?? null
    let riderAssignedAt = order?.order_set?.rider_assigned_at ?? null

    // Ensure rider assignment pulls fresh data using direct query
    if (input.status === ShipmentStatus.SHIPPED && orderSetId) {
      if (!riderAssignedAt) {
        const orderSetRecord = await knex('order_set')
          .select('rider_assigned_at')
          .where({ id: orderSetId })
          .first()

        riderAssignedAt = orderSetRecord?.rider_assigned_at ?? riderAssignedAt
      }

      if (!riderAssignedAt) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'Cannot mark shipment as SHIPPED before a rider is assigned'
        )
      }
    }

    // 3. Get line items with this shipment_id to check current status
    // Using knex directly to ensure proper filtering by shipment_id
    const lineItems = await knex('order_line_item_extension')
      .select('id', 'order_line_item_id', 'status', 'shipment_id')
      .where('shipment_id', input.shipmentId)
      .whereNull('deleted_at')

    if (!lineItems || lineItems.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `No line items found for shipment ID ${input.shipmentId}`
      )
    }

    // 4. Check if all line items are already at the target status (idempotent request)
    const allItemsAlreadyAtTargetStatus = lineItems.every(
      (lineItem: any) => lineItem.status === input.status
    )

    if (allItemsAlreadyAtTargetStatus) {
      // Return early with a flag indicating no action needed
      return new StepResponse<ValidationResult>({
        orderId,
        orderSetId,
        riderAssignedAt,
        shipments: lineItems.map((item: any) => ({
          shipment_id: item.shipment_id,
          order_line_item_id: item.order_line_item_id,
          currentStatus: item.status
        })),
        status: input.status,
        skipStatusUpdate: true
      })
    }

    // 5. Validate status transitions for all line items using centralized rules
    if (
      input.status !== ShipmentStatus.RIDER_ASSIGNED &&
      input.status !== ShipmentStatus.PACKED
    ) {
      for (const lineItem of lineItems) {
        const currentStatus = lineItem.status
        const validTransitions =
          VALID_STATUS_TRANSITIONS[
            currentStatus as keyof typeof VALID_STATUS_TRANSITIONS
          ]

        if (
          !validTransitions ||
          !(validTransitions as readonly string[]).includes(input.status)
        ) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Shipment cannot transition from ${currentStatus} to ${input.status}. Valid transitions from ${currentStatus} are: ${
              validTransitions ? validTransitions.join(', ') : 'none'
            }.`
          )
        }
      }
    }

    return new StepResponse<ValidationResult>({
      orderId,
      orderSetId,
      riderAssignedAt,
      shipments: lineItems.map((item: any) => ({
        shipment_id: item.shipment_id,
        order_line_item_id: item.order_line_item_id,
        currentStatus: item.status
      })),
      status: input.status,
      skipStatusUpdate: false
    })
  }
)

