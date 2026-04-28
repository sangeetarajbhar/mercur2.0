import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

type UpdateOrderChangeCanceledByInput = {
  orderId: string
  canceledBy: string | null | undefined
}

type UpdateOrderChangeCanceledByCompensation = {
  orderChangeIds: string[]
  previousCanceledBy: (string | null)[]
  previousCanceledAt: (Date | null)[]
  createdOrderChangeIds?: string[] // Track newly created order_change records
}

export const updateOrderChangeCanceledByStep = createStep(
  'update-order-change-canceled-by',
  async (
    input: UpdateOrderChangeCanceledByInput,
    { container }
  ): Promise<StepResponse<void, UpdateOrderChangeCanceledByCompensation | null>> => {
    const { orderId, canceledBy } = input

    if (!canceledBy) {
      console.log('[UPDATE ORDER CHANGE CANCELED BY] No canceled_by provided, skipping update')
      return new StepResponse(void 0, null)
    }


    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    try {
      // Query for all order_change records for this order
      const { data: orderChanges } = await query.graph({
        entity: 'order_change',
        fields: ['id', 'order_id', 'canceled_by', 'canceled_at'],
        filters: {
          order_id: orderId
        }
      })

      // Get the order to retrieve its version
      const { data: orders } = await query.graph({
        entity: 'order',
        fields: ['id', 'version'],
        filters: {
          id: orderId
        }
      })

      const order = orders?.[0]
      if (!order) {
        console.log('[UPDATE ORDER CHANGE CANCELED BY] Order not found, skipping')
        return new StepResponse(void 0, null)
      }

      // Store previous values for compensation
      const compensation: UpdateOrderChangeCanceledByCompensation = {
        orderChangeIds: [],
        previousCanceledBy: [],
        previousCanceledAt: [],
        createdOrderChangeIds: []
      }

      const canceledAt = new Date()

      if (!orderChanges || orderChanges.length === 0) {
        // No order_change records exist, create one        
        try {
          const [newOrderChange] = await knex('order_change')
            .insert({
              id: `oc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              order_id: orderId,
              version: order.version || 1,
              status: 'canceled',
              canceled_by: canceledBy,
              canceled_at: canceledAt,
              created_at: canceledAt,
              updated_at: canceledAt
            })
            .returning('id')

          compensation.orderChangeIds.push(newOrderChange.id)
          compensation.previousCanceledBy.push(null)
          compensation.previousCanceledAt.push(null)
          compensation.createdOrderChangeIds!.push(newOrderChange.id)

        } catch (error: any) {
          console.error('[UPDATE ORDER CHANGE CANCELED BY] Error creating order_change:', error.message)
          return new StepResponse(void 0, null)
        }
      } else {
        // Update existing order_change records
        for (const orderChange of orderChanges) {
          try {
            // Store previous values for compensation
            compensation.orderChangeIds.push(orderChange.id)
            compensation.previousCanceledBy.push(orderChange.canceled_by || null)
            compensation.previousCanceledAt.push(orderChange.canceled_at ? new Date(orderChange.canceled_at) : null)

            // Update order_change table directly
            await knex('order_change')
              .where({ id: orderChange.id })
              .update({
                canceled_by: canceledBy,
                canceled_at: canceledAt,
                updated_at: canceledAt
              })

          } catch (error: any) {
            console.error(`[UPDATE ORDER CHANGE CANCELED BY] Error updating order_change ${orderChange.id}:`, error.message)
            // Continue with other order changes even if one fails
          }
        }
      }

      return new StepResponse(void 0, compensation)
    } catch (error: any) {
      console.error('[UPDATE ORDER CHANGE CANCELED BY] Error querying/updating order_change:', error.message)
      // Don't throw - we don't want to fail the cancellation if order_change update fails
      return new StepResponse(void 0, null)
    }
  },
  async (compensationData, { container }) => {
    if (!compensationData) {
      return
    }

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // For newly created order_change records, delete them
    // For updated ones, revert the canceled_by and canceled_at values
    for (let i = 0; i < compensationData.orderChangeIds.length; i++) {
      try {
        const orderChangeId = compensationData.orderChangeIds[i]
        const wasCreated = compensationData.createdOrderChangeIds?.includes(orderChangeId)

        if (wasCreated) {
          // Delete the newly created order_change record
          await knex('order_change')
            .where({ id: orderChangeId })
            .delete()
        } else {
          // Revert the canceled_by and canceled_at values
          await knex('order_change')
            .where({ id: orderChangeId })
            .update({
              canceled_by: compensationData.previousCanceledBy[i],
              canceled_at: compensationData.previousCanceledAt[i]
            })
        }
      } catch (error: any) {
        console.error(`[UPDATE ORDER CHANGE CANCELED BY] Error reverting order_change ${compensationData.orderChangeIds[i]}:`, error.message)
      }
    }
  }
)

