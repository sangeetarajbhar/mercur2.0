import { Logger, OrderChangeDTO } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  OrderChangeStatus,
} from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

/**
 * The input for the confirm order changes step.
 */
export type ConfirmOrderChangesInput = {
  /**
   * The ID of the order to confirm changes for.
   */
  orderId: string
  /**
   * The changes to confirm.
   */
  changes: OrderChangeDTO[]
  /**
   * The ID of the user confirming the changes.
   */
  confirmed_by?: string
}

/**
 * This step confirms changes of an order.
 */
export const confirmOrderChanges = createStep(
  "confirm-order-changes",
  async (input: ConfirmOrderChangesInput, { container }) => {
    const orderModuleService = container.resolve(Modules.ORDER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    // Get order to check current version
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "version"],
      filters: {
        id: input.orderId,
      },
    })

    const order = orders?.[0]
    if (!order) {
      throw new Error(`Order ${input.orderId} not found`)
    }

    // Get the version that will be created (current order version + 1)
    const newVersion = (order.version || 1) + 1

    // DUPLICATE ITEMS FIX
    // This prevents duplicate order items when multiple order_change records exist with the same version
    const { data: existingConfirmedChanges } = await query.graph({
      entity: "order_change",
      fields: ["id", "order_id", "version", "status"],
      filters: {
        order_id: input.orderId,
        version: newVersion,
        status: OrderChangeStatus.CONFIRMED,
      },
    })

    // Additional safety check: Check if order items already exist for this new version
    const { data: existingOrderItems } = await query.graph({
      entity: "order_item",
      fields: ["id", "order_id", "item_id", "version"],
      filters: {
        order_id: input.orderId,
        version: newVersion,
      },
    })

    // If there's already a confirmed order_change with this version AND order version is already updated
    // OR if order items already exist AND order version matches, skip to prevent duplicates
    if (
      (existingConfirmedChanges &&
        existingConfirmedChanges.length > 0 &&
        order.version === newVersion) ||
      (existingOrderItems &&
        existingOrderItems.length > 0 &&
        order.version === newVersion)
    ) {
      logger.warn(
        `[confirmOrderChanges] Order change already confirmed and order version is ${newVersion} for order ${input.orderId}. Skipping to prevent duplicates.`
      )

      // Return existing order items structure
      return new StepResponse(
        {
          items: existingOrderItems || [],
          shipping_methods: [],
          credit_lines: [],
        } as any,
        []
      )
    }

    // If items exist but order version is NOT updated yet, we need to proceed with confirmation
    if (
      existingOrderItems &&
      existingOrderItems.length > 0 &&
      order.version !== newVersion
    ) {
      logger.warn(
        `[confirmOrderChanges] Order items exist for version ${newVersion} but order version is ${order.version}. Proceeding with confirmation to update order version.`
      )
      // Continue with confirmation - it will update the order version
    }
    // END DUPLICATE ITEMS FIX

    const currentChanges: Partial<OrderChangeDTO>[] = []
    const orderChanges = await orderModuleService.confirmOrderChange(
      input.changes.map((action) => {
        const update = {
          id: action.id,
          confirmed_by: input.confirmed_by,
        }

        currentChanges.push({
          ...update,
          order_id: input.orderId,
          status: action.status,
        })

        return update
      })
    )

    return new StepResponse(orderChanges, currentChanges)
  },
  async (currentChanges, { container }) => {
    if (!currentChanges?.length) {
      return
    }

    const orderModuleService = container.resolve(Modules.ORDER)
    await orderModuleService.undoLastChange(
      currentChanges[0].order_id!,
      currentChanges[0]
    )
  }
)
