import Razorpay from "razorpay"
import { IMap } from "razorpay/dist/types/api"
import { Orders } from "razorpay/dist/types/orders"
import { Payments } from "razorpay/dist/types/payments"

import {
  AbstractPaymentProvider,
  ContainerRegistrationKeys,
  MedusaError,
  MedusaErrorCodes,
  MedusaErrorTypes,
  Modules,
  PaymentActions,
  PaymentSessionStatus,
  isDefined,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CustomerDTO,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  IPaymentModuleService,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  MedusaContainer,
  PaymentSessionDTO,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"

import type {
  Options,
  RazorpayOptions,
  RazorpayProviderConfig,
  WebhookEventData,
} from "../types"
import { getAmountFromSmallestUnit } from "../utils/get-smallest-unit"

/**
 * This file is copied from the working `zilo-backend-zilo` implementation to keep
 * provider behavior and loader expectations identical.
 */
class RazorpayBase extends AbstractPaymentProvider<RazorpayOptions> {
  protected readonly options_: RazorpayProviderConfig & Options
  protected razorpay_: Razorpay
  logger: Logger
  container_: MedusaContainer

  paymentService: IPaymentModuleService

  protected constructor(container: MedusaContainer, options) {
    super(container, options)

    this.options_ = options
    this.logger = container[ContainerRegistrationKeys.LOGGER]
    this.paymentService = container[Modules.PAYMENT]
    this.container_ = container

    this.init()
  }

  protected init(): void {
    const provider = this.options_.providers?.find((p) => p.id == (this.constructor as any).identifier)

    if (!provider && !this.options_.key_id) {
      throw new MedusaError(
        MedusaErrorTypes.INVALID_ARGUMENT,
        "razorpay not configured",
        MedusaErrorCodes.CART_INCOMPATIBLE_STATE
      )
    }

    this.razorpay_ =
      this.razorpay_ ||
      new Razorpay({
        key_id: this.options_.key_id ?? provider?.options.key_id,
        key_secret: this.options_.key_secret ?? provider?.options.key_secret,
        headers: {
          "Content-Type": "application/json",
          "X-Razorpay-Account":
            this.options_.razorpay_account ??
            provider?.options.razorpay_account ??
            undefined,
        },
      })
  }

  static validateOptions(options: RazorpayOptions): void {
    if (!isDefined(options.key_id)!) {
      throw new Error("Required option `key_id` is missing in Razorpay plugin")
    }
    if (!isDefined(options.key_secret)!) {
      throw new Error("Required option `key_secret` is missing in Razorpay plugin")
    }
    if (!isDefined((options as any).razorpay_account)!) {
      throw new Error(
        "Required option `razorpay_account` is missing in Razorpay plugin"
      )
    }
    if (!isDefined((options as any).automatic_expiry_period)!) {
      if (!isDefined((options as any).manual_expiry_period)!) {
        throw new Error(
          "Required option `manual_expiry_period` is missing in Razorpay plugin"
        )
      }
      throw new Error(
        "Required option `automatic_expiry_period` is missing in Razorpay plugin"
      )
    }

    if (!isDefined((options as any).webhook_secret)!) {
      throw new Error("Required option `webhook_secret` is missing in Razorpay plugin")
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const paymentSessionId = input.context?.idempotency_key
    const { amount, currency_code }: any = input

    const toPay = Math.round(Number(amount) * 100)

    const razorpayOrder = await this.razorpay_.orders.create({
      amount: toPay,
      currency: currency_code.toUpperCase(),
      notes: {
        medusa_payment_session_id: paymentSessionId || "",
        session_id: paymentSessionId || "",
      },
      payment: {
        capture: (this.options_?.auto_capture ?? true) ? "automatic" : "manual",
        capture_options: {
          refund_speed: this.options_?.refund_speed ?? "normal",
          automatic_expiry_period: Math.max(this.options_?.automatic_expiry_period ?? 20, 12),
          manual_expiry_period: Math.max(this.options_?.manual_expiry_period ?? 10, 7200),
        },
      },
    } as any)

    return {
      id: paymentSessionId!,
      data: { razorpayOrder },
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const status = await this.getPaymentStatus({ ...input })
    return { data: input.data, status: status.status }
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return { data: input.data }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const razorpayOrder = (input.data as any)?.razorpayOrder as Orders.RazorpayOrder | undefined
    if (!razorpayOrder?.id) {
      return { status: PaymentSessionStatus.PENDING }
    }
    const latest = await this.razorpay_.orders.fetch(razorpayOrder.id)
    if (latest.status === "paid") return { status: PaymentSessionStatus.AUTHORIZED }
    if (latest.status === "created") return { status: PaymentSessionStatus.REQUIRES_MORE }
    return { status: PaymentSessionStatus.PENDING }
  }

  async getWebhookActionAndData(
    webhookData: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const webhookSignature = (webhookData.headers as any)["x-razorpay-signature"]
    const webhookSecret =
      (this.options_ as any)?.webhook_secret ||
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_TEST_WEBHOOK_SECRET

    const data = webhookData.data

    try {
      const ok = Razorpay.validateWebhookSignature(
        webhookData.rawData.toString(),
        webhookSignature as string,
        webhookSecret!
      )
      if (!ok) {
        return { action: PaymentActions.NOT_SUPPORTED }
      }
    } catch {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const event = (data as any).event as string
    const webhookEventData = webhookData.data as unknown as WebhookEventData
    const paymentData = webhookEventData.payload?.payment?.entity

    if (!paymentData) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    const order = await this.razorpay_.orders.fetch((paymentData as any).order_id)
    const amount = getAmountFromSmallestUnit(
      order.amount_paid === 0 ? (paymentData as any).amount : order.amount_paid,
      (paymentData as any).currency.toUpperCase()
    )

    const paymentSessionId =
      (paymentData as any)?.notes?.session_id ||
      (paymentData as any)?.notes?.medusa_payment_session_id ||
      (order as any)?.notes?.medusa_payment_session_id

    if (!paymentSessionId) {
      return { action: PaymentActions.NOT_SUPPORTED }
    }

    if (event === "payment.captured") {
      return { action: PaymentActions.SUCCESSFUL, data: { session_id: paymentSessionId, amount } }
    }
    if (event === "payment.authorized") {
      return { action: PaymentActions.AUTHORIZED, data: { session_id: paymentSessionId, amount } }
    }
    if (event === "payment.failed") {
      return { action: PaymentActions.FAILED, data: { session_id: paymentSessionId, amount } }
    }

    return { action: PaymentActions.NOT_SUPPORTED }
  }

  // kept for parity with zilo (used elsewhere)
  async updateRazorpayMetadataInCustomer(
    customer: CustomerDTO,
    parameterName: string,
    parameterValue: string
  ): Promise<CustomerDTO> {
    const metadata = customer.metadata
    const razorpay = (metadata?.razorpay as Record<string, string>) ?? {}
    razorpay[parameterName] = parameterValue
    return { ...customer, metadata: { ...(metadata as any), razorpay } } as any
  }

  async updateRazorpayOrderMetadata(
    orderId: string,
    metadata: IMap<string | number>
  ): Promise<Orders.RazorpayOrder> {
    const orderData = await this.razorpay_.orders.fetch(orderId)
    if (!orderData) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Invoice with ID ${orderId} not found`)
    }
    return await this.razorpay_.orders.edit(orderId, {
      notes: {
        ...(orderData.notes as any),
        ...(metadata as any),
      },
    } as any)
  }
}

export default RazorpayBase

