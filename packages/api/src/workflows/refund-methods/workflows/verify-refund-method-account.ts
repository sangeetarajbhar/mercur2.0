import {
  createWorkflow,
  WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { getCustomerContactDetailsStep } from "../steps/get-customer-contact-details";
import { validateAccountWithRazorpayStep } from "../steps/validate-account-with-razorpay";
import { createVerificationRecordStep } from "../steps/create-verification-record";
import { RAZORPAY_PAYMENT_PROVIDER } from '../../../utils/constants/payments'
import { RazorpayValidationType } from '../../../utils/constants/bank_account_verification'
import { generateReferenceIdStep, initializeRazorpayClientStep } from '../steps/index'

interface VerifyRefundMethodAccountInput {
  customerId: string;
  accountType: 'bank' | 'upi';
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
  upiId?: string;
  sourceAccountNumber?: string;
  validationType?: 'pennydrop' | 'pennyiless' | 'optimized';
  customerRefundMethodId?: string | null;
  notes?: object | null;
}

/**
 * Workflow to verify bank/UPI account with Razorpay before saving refund method
 *
 * Flow:
 * 1. Get customer contact details
 * 2. Initialize Razorpay client
 * 3. Generate unique reference ID
 * 4. Validate account with Razorpay (bank or UPI)
 * 5. Create verification record in database
 *
 * With sync Razorpay API: verification record is only created when status is completed and account is active.
 * Returns verification result with status (completed/failed); no DB write on failed or non-active.
 */
export const verifyRefundMethodAccountWorkflow = createWorkflow(
  "verify-refund-method-account-workflow",
  (input: VerifyRefundMethodAccountInput) => {
    // Step 1: Get customer contact details
    const contactDetails = getCustomerContactDetailsStep({ customerId: input.customerId });

    // Step 2: Initialize Razorpay client
    const razorpay = initializeRazorpayClientStep()

    // Step 3: Generate reference ID
    const referenceId = generateReferenceIdStep();

    // Step 4: Validate account with Razorpay
    const validationResult = validateAccountWithRazorpayStep({
      razorpay: razorpay.client,
      accountType: input.accountType,
      accountNumber: input.accountNumber,
      ifscCode: input.ifscCode,
      accountHolderName: input.accountHolderName,
      upiId: input.upiId,
      contact: contactDetails,
      referenceId: referenceId,
      sourceAccountNumber: input.sourceAccountNumber,
      validationType: input.validationType ?? RazorpayValidationType.OPTIMIZED,
      notes: input.notes,
    });

    // Step 5: Create verification record
    const verificationRecord = createVerificationRecordStep({
      customerId: input.customerId,
      customerRefundMethodId: input.customerRefundMethodId,
      gatewayId: RAZORPAY_PAYMENT_PROVIDER,
      referenceId: referenceId,
      status: validationResult.status,
      validationResponse: validationResult.validationResponse,
      accountType: input.accountType,
      error: validationResult.error ?? null,
    });

    return new WorkflowResponse({
      verification: verificationRecord.verification,
      verificationId: verificationRecord.verificationId,
      status: validationResult.status,
      referenceId: referenceId,
      validationResponse: validationResult.validationResponse,
      error: validationResult.error,
    });
  }
);
