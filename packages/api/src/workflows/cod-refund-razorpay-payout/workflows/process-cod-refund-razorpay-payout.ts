import { WorkflowResponse, createWorkflow, when } from "@medusajs/framework/workflows-sdk"
import {
  executeCodPayoutStep,
  getAndValidateVerificationStep,
  getCustomerContactStep,
  getCustomerUpiOrBankDetailsStep,
  getReturnRefundTypeLinkStep,
  recordPayoutTransactionStep,
  checkExistingPayoutForReturnStep,
} from "../steps"

export const processCodRefundViaRazorpayPayoutWorkflow = createWorkflow(
  { name: "process-cod-refund-razorpay-payout" },
  (input: any) => {
    const existingCheck = checkExistingPayoutForReturnStep({ return_id: input.return_id })

    when(existingCheck, (result) => !result.skipPayout).then(() => {
      const linkResult = getReturnRefundTypeLinkStep({ return_id: input.return_id })
      const detailsResult = getCustomerUpiOrBankDetailsStep({
        type: linkResult.type,
        typeId: linkResult.typeId,
        return_id: input.return_id,
      })
      const verificationResult = getAndValidateVerificationStep({
        customerBankAccountVerificationId: detailsResult.customerBankAccountVerificationId,
        return_id: input.return_id,
      })
      const contactResult = getCustomerContactStep({ customerId: verificationResult.customer_id })
      const payoutOutput = executeCodPayoutStep({
        amount: input.amount,
        return_id: input.return_id,
        orderId: input.orderId,
        order_line_item_id: input.order_line_item_id,
        actorId: input.actor_id,
        returnRefundLink: linkResult.returnRefundLink,
        customerUpiDetail: detailsResult.customerUpiDetail,
        customerBankDetail: detailsResult.customerBankDetail,
        fund_account_id: verificationResult.fund_account_id,
        contact_id: verificationResult.contact_id,
        contact: contactResult.contact,
        refund_source: input.refund_source,
      })
      recordPayoutTransactionStep({
        payoutResult: payoutOutput.payoutResult,
        return_id: input.return_id,
        orderId: input.orderId,
        returnRefundLinkTypeId: linkResult.returnRefundLink.type_id,
        type: linkResult.type,
        referenceId: payoutOutput.referenceId,
        customerId: verificationResult.customer_id,
        customerName: contactResult.customerName,
        queueIfLowBalance: payoutOutput.queueIfLowBalance,
        idempotencyKey: payoutOutput.idempotencyKey,
        amountInPaise: payoutOutput.amountInPaise,
        payoutMode: payoutOutput.payoutMode,
        requestNotes: payoutOutput.requestNotes,
        created_by: input.created_by,
      })
    })

    return new WorkflowResponse({ success: true })
  }
)

