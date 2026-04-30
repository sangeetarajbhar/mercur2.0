import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import {retrieveOrderReturnDetailsWorkflow} from "../../../../workflows/returns/get-return-details"
import { COD_PAYMENT_PROVIDER } from '../../../../utils/constants/payments'
import PayoutTransactionModuleService from '../../../../modules/payout-transactions/service'
import { PAYOUT_TRANSACTIONS_MODULE } from '../../../../modules/payout-transactions'
import { getFulfillmentStockLocationAddress } from '../../../utils/get-fulfillment-stock-location-address'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.AdminReturnResponse>
) => {
  const { id } = req.params

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  // Use original query structure that was working correctly (reverted from optimization)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "return",
    variables: {
      id,
      filters: {
        ...req.filterableFields,
      },
    },
    fields: [
      'id',
      'metadata',
      'display_id',
      'order_id',
      'status',
      'refund_amount',
      'location_id',
      'no_notification',
      'internal_note',
      'created_at',
      'created_by',
      'updated_at',
      'canceled_at',
      'requested_at',
      'received_at',
      'items.*',
      'order.id',
      'order.display_id',
      'order.region_id',
      'order.customer_id',
      'order.version',
      'order.sales_channel_id',
      'order.status',
      'order.is_draft_order',
      'order.email',
      'order.currency_code',
      'order.no_notification',
      'order.metadata',
      'order.canceled_at',
      'order.shipping_address_id',
      'order.billing_address_id',
      // 'order.created_at',
      // 'order.updated_at',
      // 'order.deleted_at',
      // 'order.summary',
      // 'order.items.*',
      // 'order.shipping_methods',
      'fulfillments.id',
      'fulfillments.location_id',
      'items.reason.*'
    ],
  })

  const [orderReturn] = await remoteQuery(queryObject, {
    throwIfKeyNotFound: true,
  })

  // console.dir(orderReturn, { depth: null })

  const workflowResponse = await retrieveOrderReturnDetailsWorkflow(req.scope).run({input: {orderReturn}})

  const result = workflowResponse?.result || {};
  const order = orderReturn?.order;

  orderReturn.shipping_address = order ? result.shipping_address : null;
  // billing_address not used in UI - removed to reduce payload
  orderReturn.customer = order?.customer_id ? result.customer : null;
  orderReturn.item_details = orderReturn.items?.[0]?.item_id ? result.item_details : null;
  orderReturn.returnLocation = orderReturn.fulfillments?.[0] ? (result.returnLocation as any).data : null;
  orderReturn.payment_details = result.payment_details;
  // orderReturn.payment = result.payment;
  orderReturn.refund_return_links = result.refund_order_line_item_links;
  orderReturn.split_order_payment = result.split_order_payment;
  orderReturn.customer_refund_method = result.customer_refund_method;
  // orderReturn.return_details = result.return_details;

  orderReturn.customer_bank_account_verification = result.customer_bank_account_verification;

  orderReturn.customer_return_refund_type_link = result.return_refund_type_link
  orderReturn.customer_upi_detail = result.customer_upi_detail
  orderReturn.customer_bank_detail = result.customer_bank_detail
  orderReturn.type = result.type
  if (result.customer_bank_account_verification_return_refund_type_link) {
    orderReturn.customer_bank_account_verification = result.customer_bank_account_verification_return_refund_type_link;
  }

  // @TODO if payment_session is deleted, then get provider_id from payment table
  if (result.payment_details && result.payment_details[0] && result.payment_details[0].payment_sessions[0]) {
  // if (result.payment) {
    const providerId = result.payment_details[0].payment_sessions[0].provider_id === COD_PAYMENT_PROVIDER

    // If cod then fetch the payout transactions
    orderReturn.payout_transactions = null
    if (providerId) {
      const payoutTransactionsService =
        req.scope.resolve<PayoutTransactionModuleService>(PAYOUT_TRANSACTIONS_MODULE)

      const payoutTransactions =
        await payoutTransactionsService.listPayoutTransactions(
          {
            return_id: orderReturn.id,
          }
        )

      orderReturn.payout_transactions = payoutTransactions.length > 0 ? payoutTransactions[0] : null
    }
  }

  orderReturn.enable_return_razorpay_payout_refund = process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND ? JSON.parse(process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND) : false

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  orderReturn.fulfillment_stock_location_address =
    await getFulfillmentStockLocationAddress(
      query,
      orderReturn.fulfillments?.[0]?.location_id
    )

  res.json({
    return: orderReturn,
  })
}
