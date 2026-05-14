import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from "@medusajs/framework/http";
import {
  encryptForStorage,
  generateHmac,
  maskAccountNumber,
  maskUpiId,
  maskAccountHolder
} from "../../../../modules/customer_refund_methods/utils/encryption";
import { CUSTOMER_REFUND_METHODS_MODULE } from "../../../../modules/customer_refund_methods";
import CustomerRefundMethodModuleService from "../../../../modules/customer_refund_methods/service";
import { StoreCreateRefundMethodType } from "../validators";
import { verifyRefundMethodAccountWorkflow } from "../../../../workflows/refund-methods/workflows/verify-refund-method-account";
import {
  BankAccountType,
  BankAccountVerificationStatus,
  RazorpayValidationType
} from '../../../../utils/constants/bank_account_verification'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'

/**
 * @oas [post] /store/refund-methods
 * operationId: "StoreCreateRefundMethod"
 * summary: "Create Refund Method"
 * description: "Create a new refund method for the authenticated customer. If this is the customer's first refund method, it will automatically be set as default regardless of the is_default value."
 * x-authenticated: true
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - type
 *         properties:
 *           order_id:
 *             type: string
 *             description: "Order ID associated with this refund method"
 *           return_id:
 *             type: string
 *             description: "Return ID associated with this refund method"
 *           type:
 *             type: string
 *             enum: [bank, upi]
 *             description: "Type of refund method"
 *           account_number:
 *             type: string
 *             description: "Bank account number (required for bank type)"
 *           ifsc_code:
 *             type: string
 *             description: "IFSC code (required for bank type)"
 *           account_holder_name:
 *             type: string
 *             description: "Account holder name (required for bank type)"
 *           upi_id:
 *             type: string
 *             description: "UPI ID (required for upi type)"
 *           is_default:
 *             type: boolean
 *             description: "Set as default refund method. Note: If this is the customer's first refund method, it will automatically be set as default regardless of this value."
 *             default: false
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             refund_method:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 customer_id:
 *                   type: string
 *                 order_id:
 *                   type: string
 *                 return_id:
 *                   type: string
 *                 type:
 *                   type: string
 *                   enum: [bank, upi]
 *                 masked_account:
 *                   type: string
 *                 masked_upi:
 *                   type: string
 *                 masked_holder:
 *                   type: string
 *                 ifsc_code:
 *                   type: string
 *                 is_default:
 *                   type: boolean
 *                 is_account_verified:
 *                   type: boolean
 *                   description: "Whether the account has been verified by Razorpay"
 *                 verification_status:
 *                   type: string
 *                   enum: [created, completed, failed]
 *                   description: "Current verification status from Razorpay"
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *   "400":
 *     description: Bad Request
 *   "401":
 *     description: Unauthorized
 * tags:
 *   - Store
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  //@TODO, this is an new API to raise an return request for customer
  // if checkCODReturnRazorpayPayoutEnabled is true, then it will validate bank details with razorpay
  // if checkCODReturnRazorpayPayoutEnabled is false, then it should work old functionality

  try {
    const customerRefundMethodService = req.scope.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE);
    const customerId = req.auth_context.actor_id;

    // Get validated data from middleware
    const validatedData = req.validatedBody as StoreCreateRefundMethodType;

    const checkCODReturnRazorpayPayoutEnabled = process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND ? JSON.parse(process.env.ENABLE_RETURN_RAZORPAY_PAYOUT_REFUND) : false

    // step 1: first check if any existing records found, then return it else continue logic
    let status = false
    if (checkCODReturnRazorpayPayoutEnabled) {
      status = true
    }

    const refundMethods = await customerRefundMethodService.getCustomerRefundMethodsDecrypted(customerId, status);
    // Check if a refund method with the same details already exists
    const existingRefundMethod = refundMethods.find((method) => {
      if (method.type !== validatedData.type) return false;

      if (method.type === 'upi') {
        return method.upi_id === validatedData.upi_id;
      }

      if (method.type === 'bank') {
        return method.account_number === validatedData.account_number;
      }

      return false;
    });

    // If existing refund method found, return it
    if (existingRefundMethod) {
      return res.json({
        refund_method: { ...existingRefundMethod, is_existing: true }
      });
    }

    // If no existing records found then continue the logic
    if (checkCODReturnRazorpayPayoutEnabled) {
      // Step 1: Verify account with Razorpay BEFORE saving
      // This ensures we only save valid account details
      let verificationResult: any;
      try {
        const notes = { source: 'request sent by customer for return' }

        const { result } = await verifyRefundMethodAccountWorkflow(req.scope).run({
          input: {
            customerId,
            accountType: validatedData.type,
            accountNumber: validatedData.type === BankAccountType.BANK ? validatedData.account_number : undefined,
            ifscCode: validatedData.type === BankAccountType.BANK ? validatedData.ifsc_code : undefined,
            accountHolderName: validatedData.type === BankAccountType.BANK ? validatedData.account_holder_name : undefined,
            upiId: validatedData.type === BankAccountType.UPI ? validatedData.upi_id : undefined,
            validationType: validatedData.type === BankAccountType.UPI ? RazorpayValidationType.PENNYDROP : RazorpayValidationType.OPTIMIZED,
            notes: notes ?? null
          },
        });

        verificationResult = result;

        const validationResponse = verificationResult.validationResponse || {};
        const razorpayStatus = validationResponse?.status || verificationResult.status;

        // Sync Razorpay API: only accept completed + active. Do not store on failed or non-active.
        if (razorpayStatus === BankAccountVerificationStatus.FAILED) {
          const accountTypeLabel = validatedData.type === BankAccountType.BANK ? 'bank account' : 'UPI';
          const errorMessage = validationResponse?.status_details?.description ||
            verificationResult.error ||
            `The provided ${accountTypeLabel} details could not be verified. Please check your ${accountTypeLabel} information and try again.`;

          throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage);
        }

        const accountStatus = validationResponse?.validation_results?.account_status;
        // if (razorpayStatus !== BankAccountVerificationStatus.COMPLETED || accountStatus !== 'active') {
        //   const accountTypeLabel = validatedData.type === BankAccountType.BANK ? 'bank account' : 'UPI';
        //   const errorMessage = razorpayStatus !== BankAccountVerificationStatus.COMPLETED
        //     ? `The provided ${accountTypeLabel} could not be verified. Please check your ${accountTypeLabel} information and try again.`
        //     : `The provided ${accountTypeLabel} is not active or could not be verified. Please check your ${accountTypeLabel} information and try again.`;
        //   throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage);
        // }

        if (razorpayStatus === BankAccountVerificationStatus.COMPLETED) {
          if (accountStatus !== 'active') {
            const accountTypeLabel = validatedData.type === BankAccountType.BANK ? 'bank account' : 'UPI';
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              `The provided ${accountTypeLabel} is not active or could not be verified. Please check your ${accountTypeLabel} information and try again.`
            );
          }
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
        console.error('Account verification failed:', verificationError);

        // If it's already a MedusaError, re-throw it (it has the proper format)
        if (verificationError instanceof MedusaError) {
          throw verificationError;
        }

        // Otherwise, create a user-friendly error message
        const accountTypeLabel = validatedData.type === BankAccountType.BANK ? 'bank account' : 'UPI';
        const errorMessage = verificationError.message
          ? verificationError.message
          : `Failed to verify ${accountTypeLabel} details. Please check your ${accountTypeLabel} information and try again.`;

        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          errorMessage
        );
      }

      // Step 2: Check if customer has any existing active refund methods
      const existingMethods = await customerRefundMethodService.listCustomerRefundMethods({
        customer_id: customerId,
        deleted_at: null,
        status: true, // new records
      });

      // If no active records exist, automatically set this as default
      const shouldSetAsDefault = existingMethods.length === 0 || validatedData.is_default;

      // Step 3: Prepare encrypted data based on type
      const refundMethodData: any = {
        customer_id: customerId,
        order_id: validatedData.order_id || null,
        return_id: validatedData.return_id || null,
        type: validatedData.type,
        is_default: shouldSetAsDefault,
        created_by: customerId,
        updated_by: customerId,
        // Set verification status based on validation result
        // Only mark as verified if status is 'completed' AND account_status is 'active'
        is_account_verified: verificationResult.isVerified || false,
        // @TODO status should be true as it is inserted new record, but account is not verified yet. It will verified via webhook
        // It will update via webhook
        status: true,
      };

      if (validatedData.type === BankAccountType.BANK) {
        // Encrypt sensitive bank data
        refundMethodData.account_number_enc = encryptForStorage(validatedData.account_number);
        refundMethodData.account_number_hmac = generateHmac(validatedData.account_number);
        refundMethodData.account_holder_enc = encryptForStorage(validatedData.account_holder_name);
        refundMethodData.ifsc_code = validatedData.ifsc_code; // IFSC is not sensitive

        // Generate masked values
        refundMethodData.masked_account = maskAccountNumber(validatedData.account_number);
        refundMethodData.masked_holder = maskAccountHolder(validatedData.account_holder_name);
      } else if (validatedData.type === BankAccountType.UPI) {
        // Encrypt sensitive UPI data
        refundMethodData.upi_id_enc = encryptForStorage(validatedData.upi_id);
        refundMethodData.upi_id_hmac = generateHmac(validatedData.upi_id);

        // Generate masked values
        refundMethodData.masked_upi = maskUpiId(validatedData.upi_id);
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

        } catch (updateError: any) {
          // Log but don't fail - verification record update is not critical
          console.warn('Failed to update verification record with refund method ID:', updateError);
        }
      }

      // Return masked data with verification status
      const finalValidationResponse = verificationResult.validationResponse || {};
      const maskedResponse = {
        id: refundMethod.id,
        customer_id: refundMethod.customer_id,
        order_id: refundMethod.order_id,
        return_id: refundMethod.return_id,
        type: refundMethod.type,
        masked_account: refundMethod.masked_account,
        masked_upi: refundMethod.masked_upi,
        masked_holder: refundMethod.masked_holder,
        ifsc_code: refundMethod.ifsc_code,
        is_default: refundMethod.is_default,
        is_account_verified: refundMethod.is_account_verified,
        verification_status: finalValidationResponse?.status || verificationResult.status,
        created_at: refundMethod.created_at,
        updated_at: refundMethod.updated_at,
        status: refundMethod.status,
      };

      return res.json({ refund_method: maskedResponse });

    } else if (!checkCODReturnRazorpayPayoutEnabled) {
      // Check if customer has any existing active refund methods
      const existingMethods = await customerRefundMethodService.listCustomerRefundMethods({
        customer_id: customerId,
        deleted_at: null,
        status: false // old records
      });

      // If no active records exist, automatically set this as default
      const shouldSetAsDefault = existingMethods.length === 0 || validatedData.is_default;

      // Prepare encrypted data based on type
      const refundMethodData: any = {
        customer_id: customerId,
        order_id: validatedData.order_id || null,
        return_id: validatedData.return_id || null,
        type: validatedData.type,
        is_default: shouldSetAsDefault,
        created_by: customerId,
        updated_by: customerId,
      };

      if (validatedData.type === 'bank') {
        // Encrypt sensitive bank data
        refundMethodData.account_number_enc = encryptForStorage(validatedData.account_number);
        refundMethodData.account_number_hmac = generateHmac(validatedData.account_number);
        refundMethodData.account_holder_enc = encryptForStorage(validatedData.account_holder_name);
        refundMethodData.ifsc_code = validatedData.ifsc_code; // IFSC is not sensitive

        // Generate masked values
        refundMethodData.masked_account = maskAccountNumber(validatedData.account_number);
        refundMethodData.masked_holder = maskAccountHolder(validatedData.account_holder_name);
      } else if (validatedData.type === 'upi') {
        // Encrypt sensitive UPI data
        refundMethodData.upi_id_enc = encryptForStorage(validatedData.upi_id);
        refundMethodData.upi_id_hmac = generateHmac(validatedData.upi_id);

        // Generate masked values
        refundMethodData.masked_upi = maskUpiId(validatedData.upi_id);
      }

      // Create the refund method using basic MedusaService create method
      const refundMethod = await customerRefundMethodService.createCustomerRefundMethods(refundMethodData);

      // Return masked data only
      const maskedResponse = {
        id: refundMethod.id,
        customer_id: refundMethod.customer_id,
        order_id: refundMethod.order_id,
        return_id: refundMethod.return_id,
        type: refundMethod.type,
        masked_account: refundMethod.masked_account,
        masked_upi: refundMethod.masked_upi,
        masked_holder: refundMethod.masked_holder,
        ifsc_code: refundMethod.ifsc_code,
        is_default: refundMethod.is_default,
        created_at: refundMethod.created_at,
        updated_at: refundMethod.updated_at,
        status: refundMethod.status,
        is_account_verified: refundMethod.is_account_verified,
      };

      return res.json({ refund_method: maskedResponse });
    }

  } catch (error: any) {
    console.error('Error in POST /store/refund-methods:', error);
    throw error;
  }
}
