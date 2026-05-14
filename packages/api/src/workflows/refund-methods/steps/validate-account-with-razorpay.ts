import Razorpay from 'razorpay'

import { MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import {
  validateBankAccount,
  validateUpiAccount
} from '../../../modules/customer_refund_methods/utils/razorpay-validation'
import {
  BankAccountType,
  RazorpayValidationType
} from '../../../utils/constants/bank_account_verification'
import { randomUUID } from 'crypto'

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
export const validateAccountWithRazorpayStep = createStep(
  'validate-account-with-razorpay-step',
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
        //     "status": "created",
        //     "utr": randomUUID(),
        //     "validation_results": {
        //       "account_status": null,
        //       "registered_name": null,
        //       "details": null,
        //       "name_match_score": null
        //     },
        //     "status_details": {
        //       "description": "Validation request is created",
        //       "source": "internal",
        //       "reason": "validation_request_created"
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
        //     "status": "created",
        //     "utr": randomUUID(),
        //     "validation_results": {
        //       "account_status": null,
        //       "registered_name": null,
        //       "details": null,
        //       "name_match_score": null
        //     },
        //     "status_details": {
        //       "description": "Validation request is created",
        //       "source": "internal",
        //       "reason": "validation_request_created"
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

      // Extract status from Razorpay response
      const razorpayStatus = validationResponse?.status || 'failed'

      // Extract error message from status_details if status is failed
      let errorMessage: string | null = null
      if (razorpayStatus === 'failed') {
        errorMessage = validationResponse?.status_details?.description ||
                       validationResponse?.status_details?.reason ||
                       'Account validation failed'
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
