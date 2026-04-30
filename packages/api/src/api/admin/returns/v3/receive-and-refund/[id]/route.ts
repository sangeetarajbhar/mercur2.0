import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework/http'
import { HttpTypes } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

import { withOrderReceiveLock } from '../../../../../../utils/helpers/receive-refund-lock'
import { receiveAndRefundUnifiedWorkflow } from '../../../../../../workflows/returns/workflows/receive-and-refund-unified'

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<{
    order_preview: HttpTypes.AdminOrderPreview
    return: HttpTypes.AdminReturn
    payment: { id: string } | null
    refund_processed: boolean
    total_refund_amount: number
  }>
) => {
  const { id: returnId } = req.params
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: returns } = await query.graph({
    entity: 'return',
    fields: ['order_id'],
    filters: { id: returnId }
  })
  const orderReturn = returns?.[0] as { order_id: string } | undefined
  if (!orderReturn?.order_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Return with id ${returnId} not found`
    )
  }
  const orderId = orderReturn.order_id

  /* -------------------- RECEIVE & RETURN (serialized per order via Medusa Locking Module) -------------------- */
  logger.info(
    `[receive-and-refund-v3] request received, return_id: ${returnId}, order_id: ${orderId}`
  )

  const result = await withOrderReceiveLock(req.scope, orderId, async () => {
    const { result: workflowResult } = await receiveAndRefundUnifiedWorkflow(
      req.scope
    ).run({
      input: {
        return_id: returnId,
        confirmed_by: req.auth_context.actor_id,
        filterableFields: req?.filterableFields,
        queryConfigFields: req?.queryConfig?.fields
      }
    })
    return workflowResult
  })

  logger.info(
    `[receive-and-refund-v3] workflow completed: ${JSON.stringify({
      return_id: returnId,
      refund_processed: result.refund_processed,
      total_refund_amount: result.total_refund_amount,
      payment_id: result.payment_id
    })}`
  )

  res.json({
    order_preview: result.order_preview as HttpTypes.AdminOrderPreview,
    return: result.return as HttpTypes.AdminReturn,
    payment: result.payment_id ? { id: result.payment_id } : null,
    refund_processed: result.refund_processed,
    total_refund_amount: result.total_refund_amount
  })
}
