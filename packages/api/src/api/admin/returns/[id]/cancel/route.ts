import { cancelReturnWorkflow } from "@medusajs/medusa/core-flows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { AdminPostCancelReturnReqSchemaType } from "../../validators"
import { HttpTypes } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import OrderLineItemExtensionModuleService from '../../../../../modules/order-line-item-extension/service'
import { ORDER_LINE_ITEM_EXTENSION_MODULE } from '../../../../../modules/order-line-item-extension'
import { OrderLineItemStatus } from '../../../../../utils/constants/order-statuses'

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminPostCancelReturnReqSchemaType>,
  res: MedusaResponse<HttpTypes.AdminReturnResponse>
) => {
  const { id } = req.params

  const workflow = cancelReturnWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      ...req.validatedBody,
      return_id: id,
    },
  })

  // Update the return status to canceled in the database
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  await knex('return')
    .where({ id })
    .update({
      status: 'canceled',
      updated_at: knex.fn.now()
    })

  // Get the return with items to update order line item extensions
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [returnData] } = await query.graph({
    entity: 'return',
    fields: ['id', 'items.item_id'],
    filters: {
      id: id
    }
  })

  // Update order line item extension status to RETURN_CANCELLED
  const itemId = returnData?.items?.[0]?.item_id
  if (itemId) {
    const orderLineItemExtensionService = req.scope.resolve(ORDER_LINE_ITEM_EXTENSION_MODULE) as OrderLineItemExtensionModuleService
    
    await orderLineItemExtensionService.updateOrderLineItemExtensions({
      selector: { order_line_item_id: itemId },
      data: {
        status: OrderLineItemStatus.RETURN_CANCELLED,
      }
    })
  }

  // Emit return_cancelled event
  const eventBus = req.scope.resolve("event_bus")
  await eventBus.emit({
    name: "return_cancelled",
    data: {
      return_id: id
    }
  })

  res.status(200).json({ return: result as HttpTypes.AdminReturn })
}