import { LinkDefinition } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules, MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { SPLIT_ORDER_PAYMENT_MODULE, SplitOrderPaymentModuleService } from '../../../modules/split-order-payment'
import {CreateSplitOrderPaymentsDTO, SplitOrderPaymentDTO} from '../../../types/split-order-payment'

export const createSplitOrderPaymentsStep = createStep(
  'create-split-order-payments',
  async (input: CreateSplitOrderPaymentsDTO[], { container }) => {
    const service = container.resolve<SplitOrderPaymentModuleService>(
      SPLIT_ORDER_PAYMENT_MODULE
    )
    const linkService = container.resolve(ContainerRegistrationKeys.LINK)

    const payments: SplitOrderPaymentDTO[] = []
    const links: LinkDefinition[] = []

    for (const payment of input) {
      const [result] = await service.createSplitOrderPayments([payment])

      links.push({
        [Modules.ORDER]: {
          order_id: payment.order_id
        },
        [SPLIT_ORDER_PAYMENT_MODULE]: {
          split_order_payment_id: result.id
        }
      })

      payments.push(result)
    }

    await linkService.create(links)

    return new StepResponse(payments, { ids: payments.map((p) => p.id), links })
  },
  async (
    compensation: { ids: string[]; links: LinkDefinition[] },
    { container }
  ) => {
    if (!compensation?.ids?.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Split order payment IDs are required for compensation'
      )
    }

    const service = container.resolve<SplitOrderPaymentModuleService>(
      SPLIT_ORDER_PAYMENT_MODULE
    )
    const linkService = container.resolve(ContainerRegistrationKeys.LINK)
    await service.softDeleteSplitOrderPayments(compensation.ids)
    await linkService.dismiss(compensation.links)
  }
)
