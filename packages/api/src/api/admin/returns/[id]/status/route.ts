import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import { AdminPostReturnsStatusUpdateReqSchemaType } from "../../validators"
import { updateReturnRefundStatusWorkflow } from "../../../../../workflows/returns/update-return-refund-status"

/**
 * @oas [post] /admin/returns/{id}/status
 * operationId: "AdminUpdateReturnStatus"
 * summary: "Update Return Status"
 * description: "Updates the status of a return to refunded. This directly updates the return status field in the database."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the Return.
 *     schema:
 *       type: string
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - status
 *         properties:
 *           status:
 *             type: string
 *             enum: [refunded]
 *             description: The status to update the return to (refunded)
 *           internal_note:
 *             type: string
 *             description: Optional internal note about the status update
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             return:
 *               $ref: "#/components/schemas/AdminReturn"
 * tags:
 *   - Admin Returns
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdminPostReturnsStatusUpdateReqSchemaType>,
  res: MedusaResponse<HttpTypes.AdminReturnResponse>
) => {
  const { id } = req.params
//   const { internal_note } = req.validatedBody

  // Update the return with refunded status using the workflow
  await updateReturnRefundStatusWorkflow(req.scope).run({
    input: {
      returnId: id,
      updated_by: req.auth_context.actor_id,
    //   internal_note,
    },
  })

  // Retrieve the updated return to send back
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "return",
    variables: {
      id,
      filters: {
        ...req.filterableFields,
      },
    },
    fields: ['*'],
  })

  const [orderReturn] = await remoteQuery(queryObject, {
    throwIfKeyNotFound: true,
  })

  res.json({
    return: orderReturn,
  })
}

