import { createStep } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

type UpdatePaymentAmount = {
  id: string
  amount: number
}

export const updatePaymentAmountsStep = createStep(
  'update-payment-amounts',
  async (input: UpdatePaymentAmount[] | null, { container }) => {
    if (!input?.length) {
      return
    }

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any

    for (const payment of input) {
      if (!payment?.id) {
        continue
      }

      await knex('payment')
        .where({ id: payment.id })
        .update({
          amount: payment.amount
        })
    }
  }
)

