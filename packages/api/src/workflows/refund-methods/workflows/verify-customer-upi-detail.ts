import {
  WorkflowResponse,
  createWorkflow,
  when
} from '@medusajs/framework/workflows-sdk'

import {
  BankAccountType, CustomerPaymentPreferenceStatus,
  CustomerUpiDetailStatus
} from '../../../utils/constants/bank_account_verification'
import { RAZORPAY_PAYMENT_PROVIDER } from '../../../utils/constants/payments'
import { createCustomerPaymentPreferenceWorkflow } from '../../customer-payment-preference/workflows'
import { createCustomerUpiDetailWorkflow } from '../../customer-upi-detail/workflows'
import { createVerificationRecordStep } from '../steps/create-verification-record'
import { getCustomerContactDetailsStep } from '../steps/get-customer-contact-details'
import {
  generateReferenceIdStep,
  initializeRazorpayClientStep
} from '../steps/index'
import { validateAccountWithRazorpayStepV2 } from '../steps/validate-account-with-razorpay-v2'
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows";

interface VerifyCustomerUpiDetailInput {
  customerId: string
  accountType: 'upi' | 'bank'
  upiId: string
  sourceAccountNumber?: string
  validationType?: 'pennydrop'
  notes?: object | null
  isDefault: boolean
}

export const verifyCustomerUpiDetailWorkflowId =
  'verify-customer-upi-detail-workflow'

export const verifyCustomerUpiDetailWorkflow = createWorkflow(
  {
    name: verifyCustomerUpiDetailWorkflowId,
  },
  (input: VerifyCustomerUpiDetailInput) => {
    acquireLockStep({
      key: input.upiId,
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
      upiId: input.upiId,
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

    // Step 6: Create customer upi detail record
    const createCustomerUpiDetail = when(
      'create-customer-upi-detail',
      { verificationRecord },
      ({ verificationRecord }) => {
        return !!verificationRecord.verificationId
      }
    ).then(() => {
      return createCustomerUpiDetailWorkflow.runAsStep({
        input: {
          verified_by: RAZORPAY_PAYMENT_PROVIDER,
          customer_bank_account_verification_id:
            verificationRecord.verificationId!,
          upi_id: input.upiId,
          status: CustomerUpiDetailStatus.ACTIVE,
          metadata: null,
          created_by: input.customerId,
          updated_by: null
        }
      })
    })

    // Step 7: Save Payment Preference
    const createPaymentPreference = when(
      'create-payment-preference',
      { input, createCustomerUpiDetail },
      ({ input, createCustomerUpiDetail }) => {
        return (!!createCustomerUpiDetail?.id &&
          !!input.customerId && input.isDefault)
      }
    ).then(() => {
      if (!createCustomerUpiDetail) {
        return null
      }

      return createCustomerPaymentPreferenceWorkflow.runAsStep({
        input: {
          customer_id: input.customerId,
          type: BankAccountType.UPI,
          type_id: createCustomerUpiDetail.id,
          status: CustomerPaymentPreferenceStatus.ACTIVE,
          metadata: null,
          created_by: input.customerId,
          updated_by: null,
          deleted_by: null
        }
      })
    })

    releaseLockStep({
      key: input.upiId,
    })

    return new WorkflowResponse({
      status: validationResult.status,
      validationResponse: validationResult.validationResponse,
      error: validationResult.error,
      verification: verificationRecord.verification,
      verificationId: verificationRecord.verificationId,
      customerUpiDetail: createCustomerUpiDetail,
      paymentPreference: createPaymentPreference
    })
  }
)
