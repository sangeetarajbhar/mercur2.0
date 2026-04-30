import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HttpTypes } from "@medusajs/framework/types"
import { 
  beginReceiveReturnWorkflow,
  receiveItemReturnRequestWorkflow 
} from "@medusajs/medusa/core-flows"
import { confirmReceiveReturnWorkflow } from "../../../../../../workflows/returns/workflows/confirm-receive-return"

export const POST = async (
  req: AuthenticatedMedusaRequest<{ items: any[] }>,
  res: MedusaResponse<HttpTypes.AdminReturnPreviewResponse>
) => {
  const { id } = req.params
  const { items } = req.body

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: existingOrderChanges } = await query.graph({
    entity: "order_change",
    fields: ["id", "actions.id", "actions.action"],
    filters: {
      return_id: id,
      change_type: "return_receive",
    },
  })

  console.log('existingOrderChanges', JSON.stringify(existingOrderChanges, null, 2))
  
  const hasReceiveAction = Boolean(
    existingOrderChanges?.some((change: any) =>
      (change.actions || []).some(
        (action: any) => action.action === "RECEIVE_RETURN_ITEM"
      )
    )
  )

  if (!hasReceiveAction) {
    const { data: pendingReturnReceiveChanges } = await query.graph({
      entity: "order_change",
      fields: ["id"],
      filters: {
        return_id: id,
        status: "pending",
        change_type: "return_receive",
      },
    })
    const hasPendingReturnReceiveChange = Boolean(
      pendingReturnReceiveChanges?.length
    )

    if (!hasPendingReturnReceiveChange) {
      await beginReceiveReturnWorkflow(req.scope).run({
        input: {
          return_id: id
        }
      })
    }

    await receiveItemReturnRequestWorkflow(req.scope).run({
      input: {
        items,
        return_id: id
      }
    })
  }

  // Step 3: Confirm receive return workflow (always run if step 2 succeeds)
  const { result } = await confirmReceiveReturnWorkflow(req.scope).run({
    input: {
      return_id: id,
      confirmed_by: req.auth_context.actor_id,
      filterableFields: req?.filterableFields,
      queryConfigFields: req?.queryConfig?.fields,
    },
  })

  // Emit return_items_received event
  const eventBus = req.scope.resolve("event_bus")
  await eventBus.emit({
    name: "return_items_received",
    data: {
      return_id: id
    }
  })
    
  res.json({
    order_preview: result.order_preview as unknown as HttpTypes.AdminOrderPreview,
    return: result.return,
  })
}
