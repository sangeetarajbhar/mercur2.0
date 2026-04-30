import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { refundPaymentAndRecreatePaymentSessionWorkflow } from "../../cart/workflows/refund-payment-recreate-payment-session"

/**
 * The payment session's details for compensation.
 */
export interface CompensatePaymentIfNeededStepInput {
  /**
   * The payment to compensate.
   */
  payment_session_id: string
}

export const compensatePaymentIfNeededStepId = "custom-compensate-payment-if-needed"
/**
 * Purpose of this step is to be the last compensation in cart completion workflow.
 * If the cart completion fails, this step tries to cancel or refund the payment.
 *
 * @example
 * const data = compensatePaymentIfNeededStep({
 *   payment_session_id: "pay_123"
 * })
 */
export const compensatePaymentIfNeededStep = createStep(
  compensatePaymentIfNeededStepId,
  async (data: CompensatePaymentIfNeededStepInput) => {
    const { payment_session_id } = data

    return new StepResponse(payment_session_id)
  },
  async (paymentSessionId, { container }) => {
    if (!paymentSessionId) {
      return
    }

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: paymentSessions } = await query.graph({
      entity: "payment_session",
      fields: [
        "id",
        "payment_collection_id",
        "amount",
        "raw_amount",
        "provider_id",
        "data",
        "payment.id",
        "payment.captured_at",
        "payment.customer.id",
      ],
      filters: {
        id: paymentSessionId,
      },
    })
    const paymentSession = paymentSessions[0]

    if (!paymentSession) {
      logger.info(`[COMPENSATION] No payment to compensate for session ${paymentSessionId}`)
      return
    }

    if (!paymentSession.payment?.id) {
      logger.info(`[COMPENSATION] No payment ID found for session ${paymentSessionId}`)
      return
    }

    // Check Razorpay order status (more reliable than DB during race condition)
    const razorpayOrder = (
      paymentSession.data as { razorpayOrder?: { status?: string; id?: string } } | undefined
    )?.razorpayOrder
    const isRazorpayPaid = razorpayOrder?.status === "paid"
    const isCapturedInDB = !!paymentSession.payment.captured_at
    const paymentCustomerId = (
      paymentSession.payment as { customer?: { id?: string } } | undefined
    )?.customer?.id

    // Convert amount object to number
    let refundAmount: number
    if (typeof paymentSession.raw_amount === 'object' && paymentSession.raw_amount?.value) {
      refundAmount = Number(paymentSession.raw_amount.value)
    } else {
      refundAmount = Number(paymentSession.raw_amount || paymentSession.amount)
    }

    // Race condition detected: Razorpay shows paid but DB not synced
    if (isRazorpayPaid && !isCapturedInDB) {
      try {
        const paymentModule = container.resolve(Modules.PAYMENT)
        
        // Capture the payment in Medusa DB to sync it
        await paymentModule.capturePayment({
          payment_id: paymentSession.payment.id,
          captured_by: "system-compensation"
        })
        
        // Now refund using standard workflow (DB is synced now)
        const workflowInput = {
          payment_collection_id: paymentSession.payment_collection_id,
          provider_id: paymentSession.provider_id,
          customer_id: paymentCustomerId,
          data: paymentSession.data,
          amount: refundAmount,
          payment_id: paymentSession.payment.id,
          note: "Refunded due to cart completion failure (race condition)",
        }

        await refundPaymentAndRecreatePaymentSessionWorkflow(container).run({
          input: workflowInput,
        })
        
        return // Success!
        
      } catch (captureRefundError) {
        const errorMsg = captureRefundError instanceof Error ? captureRefundError.message : String(captureRefundError)
        logger.error(`[COMPENSATION] Capture+Refund failed: ${errorMsg}`)
        
        logger.error(
          `[CRITICAL] MANUAL REFUND REQUIRED! Payment ${paymentSession.payment.id} captured with Razorpay (order: ${razorpayOrder?.id}) but auto-refund failed. Amount: ₹${refundAmount}. Refund manually in Razorpay dashboard!`
        )
        return // Exit - manual refund needed
      }
    }

    // Check if THIS specific payment has already been refunded (prevents repeated refunds)
    // This is important: if a previous attempt already refunded this payment, we should NOT refund again
    // However, if this is a NEW payment (new payment session from retry), it will have a different payment ID
    // and will be refunded normally if order creation fails
    try {
      // Check if this specific payment has refunds
      const { data: payments } = await query.graph({
        entity: "payment",
        fields: ["id", "refunds.id", "refunds.amount"],
        filters: {
          id: paymentSession.payment.id,
        },
      })
      
      const payment = payments[0]
      if (payment?.refunds && Array.isArray(payment.refunds) && payment.refunds.length > 0) {
        const totalRefunded = payment.refunds.reduce((sum: number, refund: unknown) => {
          const refundAmount = (refund as { amount?: unknown })?.amount
          const amountValue = typeof refundAmount === 'object' && refundAmount !== null && 'value' in refundAmount
            ? Number((refundAmount as { value: unknown }).value)
            : Number(refundAmount || 0)
          return sum + amountValue
        }, 0)
        
        // If this payment is already fully refunded, skip refund but don't block order creation
        // The order creation should proceed normally (or fail for other reasons, not payment)
        if (totalRefunded >= refundAmount) {
          logger.info(
            `[COMPENSATION] Payment ${paymentSession.payment.id} has already been refunded (₹${totalRefunded} >= ₹${refundAmount}). Skipping refund to prevent repeated refunds. Order creation can proceed.`
          )
          return // Payment already refunded - skip refund, but don't block anything else
        } else {
          logger.info(
            `[COMPENSATION] Payment ${paymentSession.payment.id} has partial refunds (₹${totalRefunded} < ₹${refundAmount}). Will attempt to refund remaining amount.`
          )
          // Continue with refund for the remaining amount
        }
      } else {
        // No refunds yet - this is a fresh payment, proceed with refund if needed
        logger.info(
          `[COMPENSATION] Payment ${paymentSession.payment.id} has no refunds. Will proceed with refund if order creation failed.`
        )
      }
    } catch (checkError) {
      // If we can't check refund status, continue with refund attempt
      // This ensures we don't miss refunding a payment that needs it
      logger.warn(
        `[COMPENSATION] Could not check if payment ${paymentSession.payment.id} was already refunded: ${checkError instanceof Error ? checkError.message : String(checkError)}. Continuing with refund attempt to be safe.`
      )
    }

    // Standard refund path (when DB is synced)
    try {
      logger.info(`[COMPENSATION] Attempting standard refund workflow for ₹${refundAmount}`)
      
      const workflowInput = {
        payment_collection_id: paymentSession.payment_collection_id,
        provider_id: paymentSession.provider_id,
        customer_id: paymentCustomerId,
        data: paymentSession.data,
        amount: refundAmount,
        payment_id: paymentSession.payment.id,
        note: "Refunded due to cart completion failure",
      }

      await refundPaymentAndRecreatePaymentSessionWorkflow(container).run({
        input: workflowInput,
      })
      
      logger.info(`[COMPENSATION] Successfully refunded payment ${paymentSession.payment.id}`)
      
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      logger.error(`[COMPENSATION] Refund failed: ${errorMsg}`)
      
      // If it's the "greater than refundable" error and Razorpay shows paid, it's a race condition
      if (errorMsg.includes('greater than') || errorMsg.includes('refundable')) {
        if (isRazorpayPaid) {
          logger.error(
            `[CRITICAL] MANUAL REFUND REQUIRED! Payment ${paymentSession.payment.id} captured with Razorpay but DB not synced. Amount: ₹${refundAmount}. Refund manually!`
          )
        }
      }
    }
  }
)
