import {
  WorkflowResponse,
  createWorkflow,
  when
} from '@medusajs/framework/workflows-sdk'

import {
  BankAccountType,
  CustomerBankDetailStatus,
  CustomerPaymentPreferenceStatus
} from '../../../utils/constants/bank_account_verification'
import { RAZORPAY_PAYMENT_PROVIDER } from '../../../utils/constants/payments'
import { createCustomerBankDetailWorkflow } from '../../customer-bank-detail/workflows'
import { createCustomerPaymentPreferenceWorkflow } from '../../customer-payment-preference/workflows'
import { createVerificationRecordStep } from '../steps/create-verification-record'
import { getCustomerContactDetailsStep } from '../steps/get-customer-contact-details'
import {
  generateReferenceIdStep,
  initializeRazorpayClientStep
} from '../steps/index'
import { validateAccountWithRazorpayStepV2 } from '../steps/validate-account-with-razorpay-v2'
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows";

interface VerifyCustomerBankDetailInput {
  customerId: string
  accountType: 'upi' | 'bank'
  accountNumber: string
  ifscCode: string
  accountHolderName: string
  sourceAccountNumber?: string
  validationType?: 'optimized'
  notes?: object | null
  isDefault: boolean
}

export const verifyCustomerBankDetailWorkflowId =
  'verify-customer-bank-detail-workflow'

export const verifyCustomerBankDetailWorkflow = createWorkflow(
  {
    name: verifyCustomerBankDetailWorkflowId,
  },
  (input: VerifyCustomerBankDetailInput) => {
    acquireLockStep({
      key: input.accountNumber,
      timeout: 2,
      ttl: 10,
    })

    // Step 1: Get customer contact details
    const contactDetails = getCustomerContactDetailsStep({
      customerId: input.customerId
    })

    // Step 2: Initialize Razorpay client
    const razorpay = initializeRazorpayClientStep()

    // Step 3: Generate reference ID
    const referenceId = generateReferenceIdStep()

    // Step 4: Validate upi account with Razorpay
    const validationResult = validateAccountWithRazorpayStepV2({
      razorpay: razorpay.client,
      accountType: input.accountType,
      accountNumber: input.accountNumber,
      ifscCode: input.ifscCode,
      accountHolderName: input.accountHolderName,
      contact: contactDetails,
      referenceId: referenceId,
      sourceAccountNumber: input.sourceAccountNumber,
      validationType: input.validationType,
      notes: input.notes
    })

    // Step 5: Create verification record
    const verificationRecord = createVerificationRecordStep({
      customerId: input.customerId,
      customerRefundMethodId: null,
      gatewayId: RAZORPAY_PAYMENT_PROVIDER,
      referenceId: referenceId,
      status: validationResult.status,
      validationResponse: validationResult.validationResponse,
      accountType: input.accountType,
      error: validationResult.error ?? null
    })

    // Step 6: Create customer bank detail record
    const customerBankDetail = when(
      'create-customer-bank-detail',
      { verificationRecord, validationResult },
      ({ verificationRecord, validationResult }) => {
        return (
          !!verificationRecord.verificationId &&
          !!validationResult.validationResponse
        )
      }
    ).then(() => {
      return createCustomerBankDetailWorkflow.runAsStep({
        input: {
          verified_by: RAZORPAY_PAYMENT_PROVIDER,
          customer_bank_account_verification_id:
            verificationRecord.verificationId!,
          account_number: input.accountNumber,
          ifsc_code: input.ifscCode,
          account_holder_name: input.accountHolderName,
          bank_name:
            validationResult.validationResponse?.fund_account?.bank_account
              ?.bank_name ?? null,
          status: CustomerBankDetailStatus.ACTIVE,
          metadata: null,
          created_by: input.customerId,
          updated_by: null
        }
      })
    })

    // Step 7: Save Payment Preference
    const createPaymentPreference = when(
      'create-payment-preference',
      { input, customerBankDetail },
      ({ input, customerBankDetail }) => {
        return (!!customerBankDetail?.id &&
          !!input.customerId && input.isDefault)
      }
    ).then(() => {
      if (!customerBankDetail) {
        return null
      }

      return createCustomerPaymentPreferenceWorkflow.runAsStep({
        input: {
          customer_id: input.customerId,
          type: BankAccountType.BANK,
          type_id: customerBankDetail.id,
          status: CustomerPaymentPreferenceStatus.ACTIVE,
          metadata: null,
          created_by: input.customerId,
          updated_by: null,
          deleted_by: null
        }
      })
    })

    releaseLockStep({
      key: input.accountNumber,
    })

    return new WorkflowResponse({
      status: validationResult.status,
      validationResponse: validationResult.validationResponse,
      error: validationResult.error,
      verification: verificationRecord.verification,
      verificationId: verificationRecord.verificationId,
      customerBankDetail: customerBankDetail,
      paymentPreference: createPaymentPreference
    })
  }
)
