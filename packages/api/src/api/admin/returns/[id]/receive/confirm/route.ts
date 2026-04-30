import { HttpTypes } from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { AdminPostReturnsConfirmRequestReqSchemaType } from "../../../validators"
import { confirmReceiveReturnWorkflow } from "../../../../../../workflows/returns/workflows/confirm-receive-return"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminPostReturnsConfirmRequestReqSchemaType>,
  res: MedusaResponse<HttpTypes.AdminReturnPreviewResponse>
) => {
  const { id } = req.params

  const { result } = await confirmReceiveReturnWorkflow(req.scope).run({
    input: {
      return_id: id,
      confirmed_by: req.auth_context.actor_id,
      filterableFields: req.filterableFields,
      queryConfigFields: req.queryConfig.fields,
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
