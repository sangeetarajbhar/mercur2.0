import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import CustomerRefundMethodModuleService from '../../../../../modules/customer_refund_methods/service'
import { CUSTOMER_REFUND_METHODS_MODULE } from '../../../../../modules/customer_refund_methods'
import {
  encryptForStorage,
  generateHmac,
  maskAccountNumber,
  maskUpiId,
  maskAccountHolder
} from '../../../../../modules/customer_refund_methods/utils/encryption'
import { StoreCreateRefundMethodType } from '../../../../store/refund-methods/validators'
import { verifyRefundMethodAccountWorkflow } from '../../../../../workflows/refund-methods/workflows/verify-refund-method-account'
import {
  BankAccountType,
  BankAccountVerificationStatus,
  RazorpayValidationType
} from '../../../../../utils/constants/bank_account_verification'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

export async function POST(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
  ) {

  const checkCODReturnRazorpayPayoutEnabled = process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND ? JSON.parse(process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND) : false
  if (!checkCODReturnRazorpayPayoutEnabled) {
    const customerRefundMethodService = req.scope.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE);
    const customerId = req.params.id;
    const validatedBody = req.validatedBody as StoreCreateRefundMethodType;
    // @TODO fetch old refund methods where status will be false always
    const status = false

    try {
      // Get decrypted refund methods for the customer
      const refundMethods = await customerRefundMethodService.getCustomerRefundMethodsDecrypted(customerId, status);

      // Check if a refund method with the same details already exists
      let existingRefundMethod = null;

      if (validatedBody.type === 'upi') {
        // Check if UPI ID already exists
        existingRefundMethod = refundMethods.find(
          (method: any) => method.type === 'upi' && method.upi_id === validatedBody.upi_id
        );
      } else if (validatedBody.type === 'bank') {
        // Check if account number already exists
        existingRefundMethod = refundMethods.find(
          (method: any) => method.type === 'bank' && method.account_number === validatedBody.account_number
        );
      }

      // If existing refund method found, return it
      if (existingRefundMethod) {
        return res.json({
          refund_method: existingRefundMethod,
          is_existing: true
        });
      }

      // Otherwise, create a new refund method
      // Check if customer has any existing active refund methods
      const existingMethods = await customerRefundMethodService.listCustomerRefundMethods({
        customer_id: customerId,
        deleted_at: null,
      });

      // If no active records exist, automatically set this as default
      const shouldSetAsDefault = existingMethods.length === 0 || validatedBody.is_default;

      // Prepare encrypted data based on type
      const refundMethodData: any = {
        customer_id: customerId,
        order_id: validatedBody.order_id || null,
        return_id: validatedBody.return_id || null,
        type: validatedBody.type,
        is_default: shouldSetAsDefault,
        created_by: customerId,
        updated_by: customerId,
      };

      if (validatedBody.type === 'bank') {
        // Encrypt sensitive bank data
        refundMethodData.account_number_enc = encryptForStorage(validatedBody.account_number);
        refundMethodData.account_number_hmac = generateHmac(validatedBody.account_number);
        refundMethodData.account_holder_enc = encryptForStorage(validatedBody.account_holder_name);
        refundMethodData.ifsc_code = validatedBody.ifsc_code; // IFSC is not sensitive

        // Generate masked values
        refundMethodData.masked_account = maskAccountNumber(validatedBody.account_number);
        refundMethodData.masked_holder = maskAccountHolder(validatedBody.account_holder_name);
      } else if (validatedBody.type === 'upi') {
        // Encrypt sensitive UPI data
        refundMethodData.upi_id_enc = encryptForStorage(validatedBody.upi_id);
        refundMethodData.upi_id_hmac = generateHmac(validatedBody.upi_id);

        // Generate masked values
        refundMethodData.masked_upi = maskUpiId(validatedBody.upi_id);
      }

      // Create the refund method
      const refundMethod = await customerRefundMethodService.createCustomerRefundMethods(refundMethodData);

      // Get the decrypted version to return
      const decryptedRefundMethod = await customerRefundMethodService.decryptRefundMethod(refundMethod.id);

      res.json({
        refund_method: decryptedRefundMethod,
        is_existing: false
      });

    } catch (error: any) {
      console.error('Error in POST /admin/refund-methods/[id]/customer:', error);
      throw error;
    }

  }
  else if (checkCODReturnRazorpayPayoutEnabled) {

    const customerRefundMethodService = req.scope.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE);
    const customerId = req.params.id;
    const validatedBody = req.validatedBody as StoreCreateRefundMethodType;
    // @TODO fetch new refund methods where status will be true always
    const status = true

    try {
      // Get decrypted refund methods for the customer
      const refundMethods = await customerRefundMethodService.getCustomerRefundMethodsDecrypted(customerId, status);
      // Check if a refund method with the same details already exists
      let existingRefundMethod = null;

      if (validatedBody.type === 'upi') {
        // Check if UPI ID already exists
        existingRefundMethod = refundMethods.find(
          (method: any) => method.type === 'upi' && method.upi_id === validatedBody.upi_id
        );
      } else if (validatedBody.type === 'bank') {
        // Check if account number already exists
        existingRefundMethod = refundMethods.find(
          (method: any) => method.type === 'bank' && method.account_number === validatedBody.account_number
        );
      }

      // If existing refund method found, return it
      if (existingRefundMethod) {
        return res.json({
          refund_method: existingRefundMethod,
          is_existing: false
        });
      }

      // Step 1: Verify account with Razorpay BEFORE saving (same logic as store endpoint)
      // This ensures we only save valid account details
      let verificationResult: any;
      try {
        const notes = { source: 'request sent by admin for return' }

        const { result } = await verifyRefundMethodAccountWorkflow(req.scope).run({
          input: {
            customerId,
            accountType: validatedBody.type,
            accountNumber: validatedBody.type === BankAccountType.BANK ? validatedBody.account_number : undefined,
            ifscCode: validatedBody.type === BankAccountType.BANK ? validatedBody.ifsc_code : undefined,
            accountHolderName: validatedBody.type === BankAccountType.BANK ? validatedBody.account_holder_name : undefined,
            upiId: validatedBody.type === BankAccountType.UPI ? validatedBody.upi_id : undefined,
            validationType: validatedBody.type === BankAccountType.UPI ? RazorpayValidationType.PENNYDROP : RazorpayValidationType.OPTIMIZED,
            notes: notes ?? null
          },
        });

        verificationResult = result;

        const validationResponse = verificationResult.validationResponse || {};
        const razorpayStatus = validationResponse?.status || verificationResult.status;

        // Sync Razorpay API: only accept completed + active. Do not store on failed or non-active.
        if (razorpayStatus === BankAccountVerificationStatus.FAILED) {
          const accountTypeLabel = validatedBody.type === BankAccountType.BANK ? 'bank account' : 'UPI';
          // Extract error message from Razorpay status_details
          const errorMessage = validationResponse?.status_details?.description ||
            verificationResult.error ||
            `The provided ${accountTypeLabel} details could not be verified. Please check the ${accountTypeLabel} information and try again.`;

          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            errorMessage
          );
        }

        const accountStatus = validationResponse?.validation_results?.account_status;
        if (razorpayStatus !== BankAccountVerificationStatus.COMPLETED || accountStatus !== 'active') {
          const accountTypeLabel = validatedBody.type === BankAccountType.BANK ? 'bank account' : 'UPI';
          const errorMessage = razorpayStatus !== BankAccountVerificationStatus.COMPLETED
            ? `The provided ${accountTypeLabel} could not be verified. Please check the ${accountTypeLabel} information and try again.`
            : `The provided ${accountTypeLabel} is not active or could not be verified. Please check the ${accountTypeLabel} information and try again.`;

          throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage);
        }

        // Extract additional data from validation response
        verificationResult.fundAccountId = validationResponse?.fund_account?.id || null;
        verificationResult.contactId = validationResponse?.fund_account?.contact?.id || null;
        verificationResult.registeredName = validationResponse?.validation_results?.registered_name || null;
        verificationResult.utr = validationResponse?.utr || null;
        verificationResult.accountStatus = validationResponse?.validation_results?.account_status || null;

        // Sync API: we only reach here when completed + active
        // verificationResult.isVerified = true;
        const isVerified = razorpayStatus === BankAccountVerificationStatus.COMPLETED &&
          validationResponse?.validation_results?.account_status === 'active';
        verificationResult.isVerified = isVerified;

      } catch (verificationError: any) {
        console.error('[Admin Refund Method] Account verification failed:', verificationError);

        // If it's already a MedusaError, re-throw it (it has the proper format)
        if (verificationError instanceof MedusaError) {
          throw verificationError;
        }

        // Otherwise, create a user-friendly error message
        const accountTypeLabel = validatedBody.type === BankAccountType.BANK ? 'bank account' : 'UPI';
        const errorMessage = verificationError.message
          ? verificationError.message
          : `Failed to verify ${accountTypeLabel} details. Please check the ${accountTypeLabel} information and try again.`;

        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          errorMessage
        );
      }

      // Step 2: Check if customer has any existing active refund methods
      const existingMethods = await customerRefundMethodService.listCustomerRefundMethods({
        customer_id: customerId,
        deleted_at: null,
      });

      // If no active records exist, automatically set this as default
      const shouldSetAsDefault = existingMethods.length === 0 || validatedBody.is_default;

      // Step 3: Prepare encrypted data based on type
      const refundMethodData: any = {
        customer_id: customerId,
        order_id: validatedBody.order_id || null,
        return_id: validatedBody.return_id || null,
        type: validatedBody.type,
        is_default: shouldSetAsDefault,
        created_by: customerId,
        updated_by: customerId,
        // Set verification status based on validation result
        // Only mark as verified if status is 'completed' AND account_status is 'active'
        is_account_verified: verificationResult.isVerified || false,
        // @TODO status should be true as it is inserted new record, but account is not verified yet. It will verified via webhook
        status: true
      };

      if (validatedBody.type === 'bank') {
        // Encrypt sensitive bank data
        refundMethodData.account_number_enc = encryptForStorage(validatedBody.account_number);
        refundMethodData.account_number_hmac = generateHmac(validatedBody.account_number);
        refundMethodData.account_holder_enc = encryptForStorage(validatedBody.account_holder_name);
        refundMethodData.ifsc_code = validatedBody.ifsc_code; // IFSC is not sensitive

        // Generate masked values
        refundMethodData.masked_account = maskAccountNumber(validatedBody.account_number);
        refundMethodData.masked_holder = maskAccountHolder(validatedBody.account_holder_name);
      } else if (validatedBody.type === 'upi') {
        // Encrypt sensitive UPI data
        refundMethodData.upi_id_enc = encryptForStorage(validatedBody.upi_id);
        refundMethodData.upi_id_hmac = generateHmac(validatedBody.upi_id);

        // Generate masked values
        refundMethodData.masked_upi = maskUpiId(validatedBody.upi_id);
      }

      // Step 4: Create the refund method
      const refundMethod = await customerRefundMethodService.createCustomerRefundMethods(refundMethodData);

      // Step 5: Update verification record with refund method ID (if verification was created)
      if (verificationResult.verificationId) {
        try {
          const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
          await knex("customer_bank_account_verification")
            .where("id", verificationResult.verificationId)
            .update({ customer_refund_method_id: refundMethod.id })

        } catch (linkError: any) {
          console.error('[Admin Refund Method] Failed to link verification record:', linkError)
          // Don't fail the request if linking fails - verification record exists, just not linked
        }
      }

      // Get the decrypted version to return
      const decryptedRefundMethod = await customerRefundMethodService.decryptRefundMethod(refundMethod.id);

      res.json({
        refund_method: decryptedRefundMethod,
        is_existing: false
      });

    } catch (error: any) {
      console.error('Error in POST /admin/refund-methods/[id]/customer:', error);
      throw error;
    }
  }
}
