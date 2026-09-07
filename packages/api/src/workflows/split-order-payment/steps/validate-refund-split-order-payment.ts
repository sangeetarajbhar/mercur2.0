import { ContainerRegistrationKeys, MathBN, MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { RefundSplitOrderPaymentsDTO } from '../../../modules/split-order-payment/types'
import {
  SPLIT_ORDER_PAYMENT_MODULE,
  SplitOrderPaymentModuleService
} from '../../../modules/split-order-payment'

export const validateRefundSplitOrderPaymentStep = createStep(
  'validate-refund-split-order-payments',
  async (input: RefundSplitOrderPaymentsDTO, { container }) => {
    const service = container.resolve<SplitOrderPaymentModuleService>(
      SPLIT_ORDER_PAYMENT_MODULE
    )
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const payment = await service.retrieveSplitOrderPayment(input.id)

    const amountLeft = MathBN.convert(payment.captured_amount)
      .minus(payment.refunded_amount)
      .minus(input.amount)
      .toNumber()

    const refundedAmount = MathBN.convert(input.amount)
      .plus(payment.refunded_amount)
      .toNumber()

    const status = MathBN.gt(amountLeft, 0) ? 'partially_refunded' : 'refunded'

    logger.info(
      `[validate-refund-split-order-payment] validated refund, ${JSON.stringify(
        {
          split_order_payment_id: input.id,
          amount_requested: input.amount,
          captured_amount: payment.captured_amount,
          refunded_amount_before: payment.refunded_amount,
          amount_left_after_refund: amountLeft,
          refunded_amount_after_refund: refundedAmount,
          status
        }
      )}`
    )

    if (input.amount <= 0 || MathBN.lt(amountLeft, 0)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        'Invalid refund amount!'
      )
    }

    return new StepResponse({
      id: input.id,
      refunded_amount: refundedAmount,
      status
    })
  }
)
