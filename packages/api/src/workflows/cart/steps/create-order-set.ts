import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { Knex } from 'knex'

import { CreateOrderGroupDTO, MercurModules } from '@mercurjs/types'
import { generateOrderId } from '../../../shared/utils/id-generator'
import { COD_PAYMENT_PROVIDER } from '../../../utils/constants/payments'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

type CreateOrderSetStepInput = CreateOrderGroupDTO & {
  payment_provider_id?: string
  payment_collection_id?: string
}

type SellerOrderGroupService = {
  createOrderGroups: (input: CreateOrderGroupDTO) => Promise<{ id: string }>
  softDeleteOrderGroups: (id: string) => Promise<void>
}

export const createOrderSetStep = createStep(
  'create-order-set',
  async (input: CreateOrderSetStepInput, { container }) => {
    const service = container.resolve<SellerOrderGroupService>(MercurModules.SELLER)
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Determine if COD payment
    let isCodPayment = false
    if (input.payment_provider_id) {
      isCodPayment = input.payment_provider_id === COD_PAYMENT_PROVIDER
    } else if (input.payment_collection_id) {
      // Fallback: query payment session if provider_id not provided
      const { data: paymentSessions } = await query.graph({
        entity: 'payment_session',
        fields: ['provider_id'],
        filters: {
          payment_collection_id: input.payment_collection_id
        }
      })
      isCodPayment = paymentSessions?.[0]?.provider_id === COD_PAYMENT_PROVIDER
    }

    // Set status: COD -> 'NEW', Prepaid -> 'PAYMENT_PENDING'
    const status = isCodPayment ? OrderLineItemStatus.NEW : OrderLineItemStatus.PAYMENT_PENDING

    const uiOrderSetId = generateOrderId()
    const orderGroup = await service.createOrderGroups(input)

    await knex('order_group')
      .where({ id: orderGroup.id })
      .update({
        ui_order_set_id: uiOrderSetId,
        status: status
      })

    return new StepResponse(orderGroup, orderGroup.id)
  },
  async (orderSetId: string, { container }) => {
    if (!orderSetId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Order set ID is required for compensation'
      )
    }

    const service = container.resolve<SellerOrderGroupService>(MercurModules.SELLER)
    await service.softDeleteOrderGroups(orderSetId)
  }
)
