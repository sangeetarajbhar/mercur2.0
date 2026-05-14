import Razorpay from 'razorpay'

import {ContainerRegistrationKeys, MedusaError} from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import {
  validateBankAccount,
  validateUpiAccount
} from '../../../modules/customer_refund_methods/utils/razorpay-validation'
import {
  BankAccountType, BankAccountVerificationStatus,
  RazorpayValidationType
} from '../../../utils/constants/bank_account_verification'
// import { randomUUID } from 'crypto'
import {container} from "@medusajs/framework";

interface ValidateAccountInput {
  razorpay: Razorpay
  accountType: 'bank' | 'upi'
  accountNumber?: string
  ifscCode?: string
  accountHolderName?: string
  upiId?: string
  contact: {
    name: string
    email: string
    contact: string
    // reference_id: string;
    type: string
    notes: object
  }
  referenceId: string
  sourceAccountNumber?: string
  validationType?: 'pennydrop' | 'pennyiless' | 'optimized'
  notes?: object | null
}

/**
 * Step to validate bank or UPI account with Razorpay
 */
export const validateAccountWithRazorpayStepV2 = createStep(
  'validate-account-with-razorpay-step-v2',
  async (input: ValidateAccountInput) => {
    const {
      razorpay,
      accountType,
      contact,
      referenceId,
      sourceAccountNumber,
      validationType,
      notes,
    } = input

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    try {
      let validationResponse: any
      const now = new Date().toISOString()

      if (accountType === BankAccountType.BANK) {
        if (
          !input.accountNumber ||
          !input.ifscCode ||
          !input.accountHolderName
        ) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            `Bank account validation requires accountNumber, ifscCode, and accountHolderName`
          )
        }

        // @TODO Do not remove below json. It is required for stage
        // If .env is development then send the dummy response on stage always
        // if (process.env.NODE_ENV !== 'production') {
        //   validationResponse = {
        //     "id": "fav_"+randomUUID(),
        //     "entity": "fund_account.validation",
        //     "status": "completed",
        //     "utr": randomUUID(),
        //     // "validation_results": {
        //     //   "account_status": null,
        //     //   "registered_name": null,
        //     //   "details": null,
        //     //   "name_match_score": null
        //     // },
        //     // "status_details": {
        //     //   "description": "Validation request is created",
        //     //   "source": "internal",
        //     //   "reason": "validation_request_created"
        //     // },
        //     "validation_results": {
        //       "account_status": "active",
        //       "registered_name": contact.name,
        //       "details": "The beneficiary account is valid." ,
        //       "name_match_score": 100
        //     },"status_details": {
        //       "description": "Validation request is completed",
        //       "source": "beneficiary_bank",
        //       "reason": "validation_completed"
        //     },
        //     "reference_id": randomUUID(),
        //     "notes": notes,
        //     "fund_account": {
        //       "id": "fa_" + randomUUID(),
        //       "entity": "fund_account",
        //       "account_type": "bank_account",
        //       "bank_account": {
        //         "name": input.accountHolderName,
        //         "bank_name": "STAGE BANK NAME",
        //         "ifsc": input.ifscCode,
        //         "account_number": input.accountNumber
        //       },
        //       "active": true,
        //       "created_at": now,
        //       "contact": {
        //         "id": "cont_" + randomUUID(),
        //         "entity": "contact",
        //         "name": contact.name,
        //         "email": contact.email,
        //         "contact": contact.contact,
        //         "type": "customer",
        //         "reference_id": randomUUID(),
        //         "active": true,
        //         "created_at": now,
        //         "notes": contact.notes,
        //       }
        //     }
        //   }
        // }

        // If .env is production then validate bank details via razorpay
        // if (process.env.NODE_ENV === 'production') {
          validationResponse = await validateBankAccount(razorpay, {
            accountNumber: input.accountNumber,
            ifscCode: input.ifscCode,
            accountHolderName: input.accountHolderName,
            referenceId,
            contact,
            sourceAccountNumber,
            validationType: validationType ?? RazorpayValidationType.OPTIMIZED,
            notes: notes
          })
        // }
      } else if (accountType === BankAccountType.UPI) {
        if (!input.upiId) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            `UPI validation requires upiId`
          )
        }

        // @TODO Do not remove below json. It is required for stage
        // If .env is development then send the dummy response on stage always
        // if (process.env.NODE_ENV !== 'production') {
        //   validationResponse = {
        //     "id": "fav_" + randomUUID(),
        //     "entity": "fund_account.validation",
        //     "status": "completed",
        //     "utr": randomUUID(),
        //     // "validation_results": {
        //     //   "account_status": null,
        //     //   "registered_name": null,
        //     //   "details": null,
        //     //   "name_match_score": null
        //     // },
        //     // "status_details": {
        //     //   "description": "Validation request is created",
        //     //   "source": "internal",
        //     //   "reason": "validation_request_created"
        //     // },
        //     "validation_results": {
        //       "account_status": "active",
        //       "registered_name": contact.name,
        //       "details": "The beneficiary account is valid." ,
        //       "name_match_score": 100
        //     },"status_details": {
        //       "description": "Validation request is completed",
        //       "source": "beneficiary_bank",
        //       "reason": "validation_completed"
        //     },
        //     "reference_id": randomUUID(),
        //     "notes": notes,
        //     "fund_account": {
        //       "id": "fa_" + randomUUID(),
        //       "entity": "fund_account",
        //       "account_type": "vpa",
        //       "vpa": {
        //         "address": input.upiId
        //       },
        //       "active": true,
        //       "created_at": now,
        //       "contact": {
        //         "id": "cont_" + randomUUID(),
        //         "entity": "contact",
        //         "name": contact.name,
        //         "email": contact.email,
        //         "contact": contact.contact,
        //         "type": "customer",
        //         "reference_id": randomUUID(),
        //         "active": true,
        //         "created_at": now,
        //         "notes": contact.notes
        //       }
        //     }
        //   }
        // }

        // If .env is production then validate bank details via razorpay
        // if (process.env.NODE_ENV === 'production') {
          validationResponse = await validateUpiAccount(razorpay, {
            upiId: input.upiId,
            referenceId,
            contact,
            sourceAccountNumber,
            validationType: validationType ?? RazorpayValidationType.PENNYDROP,
            notes: notes
          })
        // }
      } else {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid account type: ${accountType}. Must be 'bank' or 'upi`
        )
      }

      // Extract account_status from Razorpay response
      const accountStatus = validationResponse?.validation_results?.account_status;

      // Extract status from Razorpay response
      let razorpayStatus = validationResponse?.status || 'failed'

      // Extract error message from status_details if status is failed
      let errorMessage: string | null = null
      if (razorpayStatus === BankAccountVerificationStatus.FAILED) {
        errorMessage = validationResponse?.status_details?.description ||
                       validationResponse?.status_details?.reason

        if (!errorMessage) {
          errorMessage = 'Account validation failed'
        }

        const errorPayload = {
          status: razorpayStatus,
          source: notes,
          customerName: contact.name,
          notes: contact.notes,
          errorMessage: errorMessage,
        }

        logger.error(`V3: Bank Validation Failed, for account_type: ${JSON.stringify(errorPayload)}`)
        throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage);
      }

      if (razorpayStatus === BankAccountVerificationStatus.COMPLETED && accountStatus !== 'active') {
        // errorMessage = validationResponse?.status_details?.description ||
        //   validationResponse?.status_details?.reason

        errorMessage = 'Account is invalid'

        const errorPayload = {
          status: razorpayStatus,
          source: notes,
          customerName: contact.name,
          notes: contact.notes,
          errorMessage: errorMessage,
        }

        logger.error(`V3: Bank validation invalid, for account_type: ${JSON.stringify(errorPayload)}`)
        throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage);
      }

      if (razorpayStatus === BankAccountVerificationStatus.CREATED) {
        if (process.env.NODE_ENV !== 'production') {
          // STAGE MODE → Force status convert to completed, as on stage completed will not be received from razorpay
          logger.warn(
            `V3: Bank validation status CREATED received. Overriding to COMPLETED (non-production mode)`
          )

          validationResponse.status = BankAccountVerificationStatus.COMPLETED
          razorpayStatus = BankAccountVerificationStatus.COMPLETED
        } else {
          const errorMessage = 'Razorpay status CREATED is received'

          const errorPayload = {
            status: razorpayStatus,
            source: notes,
            customerName: contact.name,
            notes: contact.notes,
            errorMessage: errorMessage,
          }

          logger.error(`V3: Bank validation: Status Received: CREATED, for account_type: ${JSON.stringify(errorPayload)}`)
          throw new MedusaError(MedusaError.Types.INVALID_DATA, errorMessage);
        }
      }

      return new StepResponse({
        validationResponse,
        status: razorpayStatus,
        error: errorMessage
      })
    } catch (error: any) {
      // Return error details but don't fail the workflow - we'll handle it in the next step
      return new StepResponse({
        validationResponse: null,
        status: 'failed',
        error: error.message || 'Account validation failed'
      })
    }
  }
)
