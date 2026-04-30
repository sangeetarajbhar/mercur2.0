import type { MedusaContainer } from "@medusajs/framework/types"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { refetchPayment } from "../../../api/admin/payments/helpers"
import refundOrderLineItem from "../../../links/refund-order-line-item"
import returnRefundMethod from "../../../links/return_refund_method"
import { CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE } from "../../../modules/customer-bank-account-verification"
import CustomerBankAccountVerificationService from "../../../modules/customer-bank-account-verification/service"
import { CUSTOMER_REFUND_METHODS_MODULE } from "../../../modules/customer_refund_methods"
import type CustomerRefundMethodModuleService from "../../../modules/customer_refund_methods/service"
import { createCodPayout } from "../../../modules/customer_refund_methods/utils/razorpay-validation"
import {
  BankAccountType,
  BankAccountVerificationStatus,
} from "../../../utils/constants/bank_account_verification"
import {
  COD_PAYMENT_PROVIDER,
  RAZORPAY_PAYMENT_PROVIDER,
  RAZORPAY_PAYOUT_MODE,
} from "../../../utils/constants/payments"
import { createRefundOrderLineItemLinksWorkflow } from "../../payment/workflows"
import { createPayoutTransactionsWorkflow } from "../../payout-transactions/workflows"
import { updateReturnRefundStatusWorkflow } from "../../returns/update-return-refund-status"
import { refundSplitOrderPaymentWorkflow } from "../../split-order-payment/workflows"

interface QueryWithGraph {
  graph: (arg: {
    entity: string
    fields: string[]
    filters: Record<string, unknown>
  }) => Promise<{ data: unknown[] }>
}

export interface ProcessAdminPaymentRefundV4Input {
  paymentId: string
  return_id: string
  amount: number
  split_order_payment_id: string
  order_line_item_id?: string | null
  actor_id: string
  payment_fields?: string[]
  skip_update_return_status?: boolean
}

export interface ProcessAdminPaymentRefundV4Output {
  payment: unknown
  return: unknown
}

async function fetchReturnById(
  query: QueryWithGraph,
  return_id: string
): Promise<unknown> {
  const { data: returns } = await query.graph({
    entity: "return",
    fields: ["*"],
    filters: { id: return_id },
  })
  const orderReturn = returns?.[0]
  if (!orderReturn) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Return with id ${return_id} not found`
    )
  }
  return orderReturn
}

type StepLogger = {
  info: (msg: string, meta?: object) => void
  warn: (msg: string, meta?: object) => void
  error: (msg: string, meta?: object) => void
}

async function runMedusaRefundFlows(opts: {
  scope: MedusaContainer
  paymentId: string
  return_id: string
  splitOrderPaymentId: string
  amount: number
  order_line_item_id?: string | null
  actor_id: string
  query: QueryWithGraph
  skip_update_return_status?: boolean
  logger?: StepLogger
}): Promise<void> {
  const {
    scope,
    paymentId,
    return_id,
    splitOrderPaymentId,
    amount,
    order_line_item_id,
    actor_id,
    query,
    skip_update_return_status,
    logger,
  } = opts

  logger?.info("[processAdminPaymentRefundV4] runMedusaRefundFlows: starting", {
    return_id,
    paymentId,
    splitOrderPaymentId,
    amount,
    order_line_item_id,
    skip_update_return_status,
  })

  await refundSplitOrderPaymentWorkflow(scope).run({
    input: { id: splitOrderPaymentId, amount },
  })

  if (order_line_item_id) {
    await createRefundOrderLineItemLinksWorkflow(scope).run({
      input: {
        payment_id: paymentId,
        order_line_item_id,
        amount,
      },
    })

    const { data: refundLinks } = await query.graph({
      entity: refundOrderLineItem.entryPoint,
      fields: ["refund_id", "order_line_item_id"],
      filters: { order_line_item_id },
    })

    if (!refundLinks || refundLinks.length === 0) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to create refund-order-line-item link for order_line_item_id: ${order_line_item_id}`
      )
    }
  }

  if (!skip_update_return_status) {
    await updateReturnRefundStatusWorkflow(scope).run({
      input: { returnId: return_id, updated_by: actor_id },
    })
  }
}

export const processAdminPaymentRefundV4Step = createStep(
  "process-admin-payment-refund-v4",
  async (
    input: ProcessAdminPaymentRefundV4Input,
    { container }
  ): Promise<StepResponse<ProcessAdminPaymentRefundV4Output>> => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as StepLogger
    const query = container.resolve(ContainerRegistrationKeys.QUERY) as QueryWithGraph
    const scope = container as MedusaContainer

    const {
      paymentId,
      return_id,
      amount,
      split_order_payment_id: splitOrderPaymentId,
      order_line_item_id,
      actor_id,
      payment_fields = ["*"],
    } = input

    let checkCODReturnRazorpayPayoutEnabled = false
    try {
      checkCODReturnRazorpayPayoutEnabled = process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND
        ? JSON.parse(process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND)
        : false
    } catch {
      checkCODReturnRazorpayPayoutEnabled = false
    }

    if (!checkCODReturnRazorpayPayoutEnabled) {
      await runMedusaRefundFlows({
        scope,
        paymentId,
        return_id,
        splitOrderPaymentId,
        amount,
        order_line_item_id,
        actor_id,
        query,
        skip_update_return_status: input.skip_update_return_status,
        logger,
      })

      const payment = await refetchPayment(paymentId, scope, payment_fields)
      const returnData = await fetchReturnById(query, return_id)
      return new StepResponse({ payment, return: returnData })
    }

    if (!return_id?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "return_id field required"
      )
    }

    if (!splitOrderPaymentId?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "split_order_payment_id field required"
      )
    }

    if (typeof amount !== "number" || amount <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "amount field required and it should not be less than OR Equal to Zero"
      )
    }

    const { data: returns } = await query.graph({
      entity: "return",
      fields: ["id", "order_id"],
      filters: { id: return_id },
    })

    const orderReturn = returns?.[0] as { order_id: string } | undefined
    if (!orderReturn) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Return with id ${return_id} not found`
      )
    }

    const orderId = orderReturn.order_id

    const { data: payments } = (await query.graph({
      entity: "payment",
      fields: ["id", "payment_collection_id"],
      filters: { id: paymentId },
    })) as { data: Array<{ payment_collection_id?: string }> }

    const getPayment = payments?.[0]
    if (!getPayment) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Payment with id ${paymentId} not found`
      )
    }

    let providerId: string | undefined

    if (getPayment.payment_collection_id) {
      const { data: sessions } = (await query.graph({
        entity: "payment_session",
        fields: ["provider_id"],
        filters: {
          payment_collection_id: getPayment.payment_collection_id,
        },
      })) as { data: Array<{ provider_id?: string }> }

      providerId = sessions?.[0]?.provider_id
    }

    const isCod = providerId === COD_PAYMENT_PROVIDER

    if (!isCod) {
      await runMedusaRefundFlows({
        scope,
        paymentId,
        return_id,
        splitOrderPaymentId,
        amount,
        order_line_item_id,
        actor_id,
        query,
        skip_update_return_status: input.skip_update_return_status,
        logger,
      })

      const payment = await refetchPayment(paymentId, scope, payment_fields)
      const returnData = await fetchReturnById(query, return_id)
      return new StepResponse({ payment, return: returnData })
    }

    const { data: refundMethodLinks } = (await query.graph({
      entity: returnRefundMethod.entryPoint,
      fields: [
        "customer_refund_method.id",
        "customer_refund_method.order_id",
        "customer_refund_method.is_account_verified",
        "customer_refund_method.status",
      ],
      filters: { return_id },
    })) as {
      data: Array<{
        customer_refund_method?: {
          id?: string
          is_account_verified?: boolean
          status?: boolean
        }
      }>
    }

    const link = refundMethodLinks?.[0]
    const refundMethodId = link?.customer_refund_method?.id

    if (!refundMethodId?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "COD refund requires a linked refund method (bank/UPI). Add and verify bank/UPI when creating the return."
      )
    }

    const isVerified = link?.customer_refund_method?.is_account_verified === true
    if (!isVerified) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Bank/UPI account must be verified before processing COD refund."
      )
    }

    const isStatus = link?.customer_refund_method?.status === true
    if (!isStatus) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Bank/UPI account must be verified & active before processing COD refund."
      )
    }

    const verificationService = container.resolve<CustomerBankAccountVerificationService>(
      CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE
    )
    const list = await verificationService.listCustomerBankAccountVerifications({
      customer_refund_method_id: refundMethodId,
    })

    if (!list.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "COD refund requires a linked refund method (bank/UPI). Add and verify bank/UPI when creating the return."
      )
    }

    if (list[0].status === BankAccountVerificationStatus.CREATED) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "COD refund requires a linked refund method (bank/UPI). Account is created, but not verified. Check razorpay"
      )
    }

    if (!list[0].fund_account_id || !list[0].contact_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "COD refund requires a linked refund method (bank/UPI). Razorpay Fund account Id and Contact Id is required to do payouts"
      )
    }

    if (!list[0].customer_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "COD refund requires a linked refund method (bank/UPI). CustomerId is not set"
      )
    }

    const fundAccountId = list[0].fund_account_id
    const contactId = list[0].contact_id
    const customerId = list[0].customer_id

    const customerRefundMethodService = container.resolve(
      CUSTOMER_REFUND_METHODS_MODULE
    ) as CustomerRefundMethodModuleService
    const decryptedRefundMethod =
      await customerRefundMethodService.decryptRefundMethod(refundMethodId)

    const customerModule = container.resolve(Modules.CUSTOMER)
    const customer = await customerModule.retrieveCustomer(customerId)

    const customerName = [customer.first_name, customer?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim()

    const contact = {
      phone: customer.phone || "",
      name: customerName,
      email: customer?.email || "",
    }

    const amountInPaise = Math.round(amount * 100)
    const idempotencyKey = `${return_id}`
    const queueIfLowBalance = true
    const referenceId = return_id.length > 40 ? return_id.slice(0, 40) : return_id
    const requestNotes = {
      return_id,
      order_id: orderId,
      ...(order_line_item_id ? { order_line_item_id } : {}),
      actor_id,
      refund_source: "Refund Processed by System",
    }

    const payoutResult = await createCodPayout({
      amount,
      refundMethod:
        decryptedRefundMethod as Parameters<typeof createCodPayout>[0]["refundMethod"],
      contact,
      return_id,
      order_id: orderId,
      fund_account_id: fundAccountId,
      contact_id: contactId,
      idempotencyKey,
      queueIfLowBalance,
      referenceId,
      requestNotes,
    })

    const payoutMode =
      decryptedRefundMethod.type === BankAccountType.UPI
        ? RAZORPAY_PAYOUT_MODE.UPI
        : RAZORPAY_PAYOUT_MODE.IMPS

    if (payoutResult && payoutResult.payout_id) {
      await createPayoutTransactionsWorkflow.run({
        input: {
          provider: RAZORPAY_PAYMENT_PROVIDER,
          provider_payout_id: payoutResult.payout_id,
          provider_fund_account_id: payoutResult.fund_account_id,
          return_id,
          order_id: orderId,
          payment_id: null,
          customer_refund_method_id: refundMethodId,
          reference_id: referenceId,
          customer_id: customerId,
          customer_name: customerName,
          payout_type: "cod_refund",
          queue_if_low_balance: queueIfLowBalance,
          idempotency_key: idempotencyKey,
          amount: amountInPaise,
          currency: "INR",
          payout_mode: payoutMode,
          purpose: "refund",
          notes: requestNotes,
          status: payoutResult.status,
          status_details: payoutResult.status_details ?? null,
          fees: payoutResult.fees ?? null,
          tax: payoutResult.tax ?? null,
          response_snapshot: JSON.stringify(payoutResult),
          created_by: actor_id,
        },
      })
    }

    await runMedusaRefundFlows({
      scope,
      paymentId,
      return_id,
      splitOrderPaymentId,
      amount,
      order_line_item_id,
      actor_id,
      query,
      skip_update_return_status: input.skip_update_return_status,
      logger,
    })

    const payment = await refetchPayment(paymentId, scope, payment_fields)
    const returnData = await fetchReturnById(query, return_id)
    return new StepResponse({ payment, return: returnData })
  }
)
