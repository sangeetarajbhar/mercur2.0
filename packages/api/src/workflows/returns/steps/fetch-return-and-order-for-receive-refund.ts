import { Knex } from 'knex'

import {
  ContainerRegistrationKeys,
  MedusaError
} from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { COD_PAYMENT_PROVIDER } from '../../../utils/constants/payments'

export interface FetchReturnAndOrderForReceiveRefundInput {
  return_id: string
}

export interface ReturnItemWithAmount {
  order_line_item_id: string
  amount: number
}

export interface FetchReturnAndOrderForReceiveRefundOutput {
  orderReturn: {
    id: string
    order_id: string
    status: string
    refund_amount: number
    items: Array<{
      id: string
      item_id: string
      quantity: number
    }>
  }
  order: {
    id: string
    items: Array<{
      id: string
      order_line_item_extension?: {
        item_total: number
      }
    }>
    payment_collections: Array<{
      id: string
      payment_sessions: Array<{
        provider_id: string
        payment?: {
          id: string
        }
      }>
    }>
    split_order_payment?: {
      id: string
    }
  }
  receiveItems: Array<{
    id: string
    quantity: number
  }>
  return_item_ids: ReturnItemWithAmount[]
  totalRefundAmount: number
  paymentId: string | null
  splitOrderPaymentId: string | null
  orderId: string
  isCod: boolean
}

export const fetchReturnAndOrderForReceiveRefundStep = createStep(
  'fetch-return-and-order-for-receive-refund',
  async (
    input: FetchReturnAndOrderForReceiveRefundInput,
    { container }
  ): Promise<StepResponse<FetchReturnAndOrderForReceiveRefundOutput>> => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    logger.info(`[fetch-return-and-order-for-receive-refund] started, 
      ${JSON.stringify({
        return_id: input.return_id
      })}
    `)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const knex = container.resolve(
      ContainerRegistrationKeys.PG_CONNECTION
    ) as Knex

    /* -------------------- FETCH RETURN -------------------- */
    const { data: returns } = await query.graph({
      entity: 'return',
      fields: [
        'id',
        'order_id',
        'status',
        'refund_amount',
        'items.id',
        'items.item_id',
        'items.quantity'
      ],
      filters: {
        id: input.return_id
      }
    })

    const orderReturnRaw = returns?.[0]

    if (!orderReturnRaw) {
      logger.error(`[fetch-return-and-order-for-receive-refund] return not found, 
      ${JSON.stringify({
        return_id: input.return_id
      })}
    `)
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Return with id ${input.return_id} not found`
      )
    }

    const orderReturn =
      returns?.[0] as FetchReturnAndOrderForReceiveRefundOutput['orderReturn']

    if (orderReturn.status === 'refunded') {
      logger.error(`[fetch-return-and-order-for-receive-refund] return already refunded, 
      ${JSON.stringify({
        return_id: input.return_id,
        status: orderReturn.status
      })}
    `)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Return ${input.return_id} is already refunded`
      )
    }

    /* -------------------- FETCH RETURN ITEM (LATEST) -------------------- */
    const returnItem = await knex('return_item as ri')
      .select(
        'ri.id',
        'ri.return_id',
        'ri.reason_id',
        'ri.item_id',
        'ri.quantity'
      )
      .where('ri.return_id', input.return_id)
      .whereNull('ri.deleted_at')
      .orderBy('ri.created_at', 'desc')
      .first()

    if (!returnItem) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Return Items with id ${input.return_id} not found`
      )
    }

    /* -------------------- VALIDATE ITEM MATCH -------------------- */
    // Each Return will have only 1 item and 1 quantity
    const returnItemIdsFromReturn =
      orderReturn.items?.map((item: { item_id: string }) => item.item_id) || []

    if (!returnItemIdsFromReturn.includes(returnItem.item_id)) {
      logger.error(`[fetch-return-and-order-for-receive-refund] return item mismatch, 
      ${JSON.stringify({
        return_id: input.return_id,
        status: orderReturn.status,
        item_id: returnItem.item_id
      })}
    `)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Return item mismatch: ${returnItem.item_id} not found in orderReturn items`
      )
    }

    /* -------------------- FETCH ORDER -------------------- */
    const { data: orders } = await query.graph({
      entity: 'order',
      fields: [
        'id',
        'items.id',
        'items.order_line_item_extension.item_total',
        'payment_collections.id',
        'payment_collections.payment_sessions.provider_id',
        'payment_collections.payment_sessions.payment.id',
        'split_order_payment.id'
      ],
      filters: {
        id: orderReturn.order_id
      }
    })

    const orderRaw = orders?.[0]

    if (!orderRaw) {
      logger.error(`[fetch-return-and-order-for-receive-refund] return, order_id not found, 
      ${JSON.stringify({
        return_id: input.return_id,
        order_id: orderReturn.order_id,
        status: orderReturn.status,
        item_id: returnItem.item_id
      })}
    `)
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order with id ${orderReturn.order_id} not found`
      )
    }

    const order =
      orders?.[0] as FetchReturnAndOrderForReceiveRefundOutput['order']

    /* -------------------- OPTIMIZED ITEM LOOKUP -------------------- */
    const orderItemMap = new Map<
      string,
      FetchReturnAndOrderForReceiveRefundOutput['order']['items'][number]
    >((order.items || []).map((item) => [item.id, item]))

    /* -------------------- PROCESS REFUND ITEMS -------------------- */
    const return_item_ids: ReturnItemWithAmount[] = []
    let totalRefundAmount = 0

    for (const itemId of returnItemIdsFromReturn) {
      const orderItem = orderItemMap.get(itemId)

      if (!orderItem) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Order item ${itemId} not found in order`
        )
      }

      const amount = orderItem?.order_line_item_extension?.item_total

      if (amount != null && amount > 0) {
        return_item_ids.push({
          order_line_item_id: itemId,
          amount
        })

        totalRefundAmount += amount
      }
    }

    /* -------------------- RECEIVE ITEMS -------------------- */
    const receiveItems =
      orderReturn.items?.map((item: { item_id: string; quantity: number }) => ({
        id: item.item_id,
        quantity: item.quantity
      })) || []

    /* -------------------- PAYMENT INFO -------------------- */
    // @TODO if payment_session is deleted, then get provider_id from payment table
    const paymentSession = order.payment_collections?.[0]?.payment_sessions?.[0]
    // const paymentCollection = order.payment_collections?.[0]
    // const {
    //   data: [payment]
    // } = await query.graph({
    //   entity: 'payment',
    //   fields: ['id', 'provider_id'],
    //   filters: {
    //     payment_collection_id: paymentCollection.id,
    //     deleted_at: {
    //       $eq: null,
    //     },
    //   },
    //   pagination: {
    //     order: {
    //       payment_collection_id: "DESC",
    //     },
    //   },
    // })

    const paymentId = paymentSession?.payment?.id ?? null
    const providerId = paymentSession?.provider_id
    // const paymentId = payment?.id ?? null
    // const providerId = payment?.provider_id ?? null
    const splitOrderPaymentId = order.split_order_payment?.id ?? null
    const isCod = providerId === COD_PAYMENT_PROVIDER

    logger.info(`[fetch-return-and-order-for-receive-refund] completed, 
      ${JSON.stringify({
        return_id: input.return_id,
        return_status: orderReturn.status,
        is_cod: isCod,
        total_refund_amount: totalRefundAmount,
        payment_id: paymentId,
        split_order_payment_id: splitOrderPaymentId
      })}
    `)

    return new StepResponse({
      orderReturn,
      order,
      receiveItems,
      return_item_ids,
      totalRefundAmount,
      paymentId,
      splitOrderPaymentId,
      orderId: order.id,
      isCod
    })
  }
)
