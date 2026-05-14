import CustomerBankAccountVerificationService from '../../../modules/customer-bank-account-verification/service'

import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE } from '../../../modules/customer-bank-account-verification'
import { encryptForStorage } from '../../../modules/customer_refund_methods/utils/encryption'
import { BankAccountType, BankAccountVerificationStatus} from '../../../utils/constants/bank_account_verification'

interface ValidationResponseShape {
  id?: string
  fund_account?: { id?: string; contact?: { id?: string } }
  validation_results?: { account_status?: string; registered_name?: string }
  utr?: string
  [key: string]: unknown
}

interface CreateVerificationRecordInput {
  customerId: string
  customerRefundMethodId?: string | null
  gatewayId: string
  referenceId: string
  status: 'created' | 'completed' | 'failed'
  validationResponse: ValidationResponseShape | null
  accountType: 'bank' | 'upi'
  error?: string | null
}

/** Step output: verification only set when status is completed and account is active */
interface CreateVerificationRecordOutput {
  verification: { id: string } | null
  verificationId: string | null
}

/**
 * Step to create verification record in database.
 * With sync Razorpay API: only persist when status is 'completed' and account_status is 'active'.
 * Do not store anything for failed or non-active (e.g. created, invalid) — no DB write.
 */
export const createVerificationRecordStep = createStep(
  'create-verification-record-step',
  async (input: CreateVerificationRecordInput, { container }): Promise<StepResponse<CreateVerificationRecordOutput, string | null>> => {
    const {
      customerId,
      customerRefundMethodId,
      gatewayId,
      referenceId,
      status,
      validationResponse,
      accountType,
    } = input

    const accountStatus = validationResponse?.validation_results?.account_status ?? null
    const isCompletedAndActive = status === BankAccountVerificationStatus.COMPLETED && accountStatus === 'active'

    // In Prod, if status completed is received from razorpay then it should not store in DB & throw error
    // On Stage, for testing purpose we are bypassing the flow.
    if (process.env.NODE_ENV === 'production') {
      if (!isCompletedAndActive) {
        return new StepResponse<CreateVerificationRecordOutput, string | null>(
          { verification: null, verificationId: null },
          null
        )
      }
    }

    const verificationService =
      container.resolve<CustomerBankAccountVerificationService>(
        CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE
      )

    // Extract data from validation response (Razorpay composite API structure)
    const fundAccountValidationId = validationResponse?.id ?? null
    const fundAccountId = validationResponse?.fund_account?.id ?? null
    const contactId = validationResponse?.fund_account?.contact?.id ?? null
    const registeredName = validationResponse?.validation_results?.registered_name ?? null
    const utr = validationResponse?.utr ?? null
    const bankAccountStatus = validationResponse?.validation_results?.account_status ?? null

    // Only reached when status is 'completed' and account is active; no failure reason
    const failureReason = null

    // Encrypt raw gateway response
    const rawResponseEnc = validationResponse
      ? encryptForStorage(JSON.stringify(validationResponse))
      : null

    const verificationData = {
      customer_id: customerId,
      customer_refund_method_id: customerRefundMethodId,
      gateway_id: gatewayId,
      reference_id: referenceId,
      status: status,
      utr: utr,
      fav_id: fundAccountValidationId,
      fund_account_id: fundAccountId,
      contact_id: contactId,
      registered_name: registeredName,
      bank_account_status: bankAccountStatus,
      failure_reason: failureReason,
      raw_gateway_response_enc: rawResponseEnc,
      metadata: {
        validation_type:
          accountType === BankAccountType.BANK ? 'bank_account' : 'vpa',
        validation_initiated_at: new Date().toISOString()
      },
      created_by: customerId,
      updated_by: customerId
    }

    const created =
      await verificationService.createCustomerBankAccountVerifications(
        verificationData
      )
    const verification = Array.isArray(created) ? created[0] : created

    return new StepResponse<CreateVerificationRecordOutput, string | null>(
      {
        verification: verification as { id: string },
        verificationId: verification.id
      },
      verification.id
    )
  },
  async (verificationId: string | null | undefined, { container }) => {
    if (!verificationId) {
      return
    }

    const verificationService =
      container.resolve<CustomerBankAccountVerificationService>(
        CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE
      )

    // Roll back the created verification record
    await verificationService.softDeleteCustomerBankAccountVerifications(
      verificationId
    )
  }
)
