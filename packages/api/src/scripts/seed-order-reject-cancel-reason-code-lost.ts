import { ExecArgs } from '@medusajs/framework/types'
import OrderReasonCodeModuleService from '../modules/order-reason-code/service'
import { ORDER_REASON_CODE_MODULE } from '../modules/order-reason-code'

const REASON_CODE = 'LOST'

export default async function seedOrderRejectCancelReasonCodeLost({ container }: ExecArgs) {
  const orderReasonCodeService: OrderReasonCodeModuleService = container.resolve(ORDER_REASON_CODE_MODULE)

  const existing = await orderReasonCodeService.listOrderRejectCancelReasonCodes({ reason_code: REASON_CODE })
  if (existing.length > 0) {
    return existing
  }

  const reasonCodes = [
    {
      reason_code: REASON_CODE,
      reason: 'Lost',
    },
  ]

  const results = await orderReasonCodeService.createOrderRejectCancelReasonCodes(reasonCodes)
  return results
}
