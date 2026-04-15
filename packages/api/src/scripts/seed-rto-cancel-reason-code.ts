import { ExecArgs } from '@medusajs/framework/types'
import OrderReasonCodeModuleService from '../modules/order-reason-code/service'
import { ORDER_REASON_CODE_MODULE } from '../modules/order-reason-code'

export default async function seedRTOCancelReasonCode({ container }: ExecArgs) {
  const orderReasonCodeService: OrderReasonCodeModuleService = container.resolve(ORDER_REASON_CODE_MODULE)

  const reasonCodes = [
    {
      reason_code: 'RTO',
      reason: "Couldn't Deliver So Returning To Origin",
    },
  ]

  // Use the service directly - simpler and more efficient for seeding
  const results = await orderReasonCodeService.createOrderRejectCancelReasonCodes(reasonCodes)

  return results
}

