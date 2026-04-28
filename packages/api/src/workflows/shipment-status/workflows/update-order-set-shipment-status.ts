import {
  WorkflowResponse,
  createWorkflow,
  when
} from '@medusajs/framework/workflows-sdk'

import { ShipmentStatus } from '../../../utils/constants/order-statuses'
import {
  captureOrderSetAuthorizedAmountStep,
  updateOrderSetShipmentStatusStep
} from '../steps'

type UpdateOrderSetShipmentStatusWorkflowInput = {
  order_set_id: string
  status: string
}

export const updateOrderSetShipmentStatusWorkflow = createWorkflow(
  'update-order-set-shipment-status',
  function (input: UpdateOrderSetShipmentStatusWorkflowInput) {
    const updateResult = updateOrderSetShipmentStatusStep({
      orderSetId: input.order_set_id,
      status: input.status
    })

    when({ status: input.status }, ({ status }) => status === ShipmentStatus.DELIVERED)
      .then(() => {
        captureOrderSetAuthorizedAmountStep({
          orderSetId: input.order_set_id
        })
      })

    return new WorkflowResponse(updateResult)
  }
)
