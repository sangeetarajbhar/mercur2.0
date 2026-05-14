import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework/http'
import {
  ContainerRegistrationKeys,
  MedusaError
} from '@medusajs/framework/utils'

import {CUSTOMER_BANK_MODULE} from '../../../../modules/customer-bank-detail'
import CustomerBankModuleService from '../../../../modules/customer-bank-detail/service'
import {CUSTOMER_UPI_MODULE} from '../../../../modules/customer-upi-detail'
import CustomerUpiModuleService from '../../../../modules/customer-upi-detail/service'
import {
  BankAccountType,
  BankAccountVerificationStatus, CustomerBankDetailStatus, CustomerUpiDetailStatus,
  RazorpayValidationType,
  CustomerPaymentPreferenceStatus
} from '../../../../utils/constants/bank_account_verification'
import {
  verifyCustomerBankDetailWorkflow
} from '../../../../workflows/refund-methods/workflows/verify-customer-bank-detail'
import {
  verifyCustomerUpiDetailWorkflow
} from '../../../../workflows/refund-methods/workflows/verify-customer-upi-detail'
import {StoreCreateRefundMethodType} from '../validators'
import {generateHmac} from "../../../../modules/customer_refund_methods/utils/encryption";
import {listCustomerRefundMethodByCustomerIdNewMapping} from "../../../../workflows/customer-refund-method/workflows";
import {createCustomerPaymentPreferenceWorkflow} from "../../../../workflows/customer-payment-preference/workflows";
import CustomerPaymentPreferencesModuleService from "../../../../modules/customer-payment-preferences/service";
import {CUSTOMER_PAYMENT_PREFERENCES_MODULE} from "../../../../modules/customer-payment-preferences";

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  //@TODO, this is an new API to save & verify upi/bank details
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      'Unauthorized request., Please login again.'
    )
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const validatedData = req.validatedBody as StoreCreateRefundMethodType

  const customerUpiDetailService =
    req.scope.resolve<CustomerUpiModuleService>(CUSTOMER_UPI_MODULE)

  const customerBankDetailService =
    req.scope.resolve<CustomerBankModuleService>(CUSTOMER_BANK_MODULE)

  const isUpi = validatedData.type === BankAccountType.UPI
  const isBank = validatedData.type === BankAccountType.BANK

  if (!isUpi && !isBank) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Invalid account type"
    )
  }

  const notes = {source: 'request sent by customer for return v3'}

  let verificationResult: any

  // If Upi
  if (isUpi) {
    const isUpiEnable = process.env.IS_UPI_REFUND_ENABLE || 'true'
    if (isUpiEnable === 'true') {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, 'UPI refunds are not supported currently. Please provide your bank details to receive the refund.')
    }

    const upi_id_hmac = generateHmac(validatedData.upi_id)
    const existingDetails =
      await customerUpiDetailService.listCustomerUpiDetails({
          upi_id_hmac: upi_id_hmac,
          deleted_at: null,
          status: CustomerUpiDetailStatus.ACTIVE,
        },
        {
          select: ["id", "masked_upi", "status", "metadata", "created_at"]
        }
      )

    if (existingDetails.length > 0) {
      //if user click on save payment preference
      if (validatedData.is_default) {
        const customerPaymentPreferenceService =
          req.scope.resolve<CustomerPaymentPreferencesModuleService>(CUSTOMER_PAYMENT_PREFERENCES_MODULE)

        const checkExistingDetails =
          await customerPaymentPreferenceService.listCustomerPaymentPreferences({
            type_id: existingDetails[0].id,
            type: BankAccountType.UPI,
            status: CustomerPaymentPreferenceStatus.ACTIVE,
            customer_id: customerId
          })

        // If same UPI details is not store for the customer then only save the payment preferences
        if (checkExistingDetails.length === 0) {
          await createCustomerPaymentPreferenceWorkflow.run({
            input: {
              customer_id: customerId,
              type: BankAccountType.UPI,
              type_id: existingDetails[0].id,
              status: CustomerPaymentPreferenceStatus.ACTIVE,
              metadata: null,
              created_by: customerId,
              updated_by: null,
              deleted_by: null
            }
          })
        }
      }

      // Only one record with same upi should exist in DB
      return res.json({refund_method: existingDetails[0], is_existing: true})
    }

    verificationResult = await verifyCustomerUpiDetailWorkflow(req.scope).run({
      input: {
        customerId,
        accountType: validatedData.type,
        upiId: validatedData.upi_id,
        validationType: RazorpayValidationType.PENNYDROP,
        notes: notes,
        isDefault: validatedData.is_default ?? false
      }
    })
  }

  // If Bank
  if (isBank) {
    const account_number_hmac = generateHmac(validatedData.account_number)
    const existingDetails =
      await customerBankDetailService.listCustomerBankDetails({
          account_number_hmac: account_number_hmac,
          deleted_at: null,
          status: CustomerBankDetailStatus.ACTIVE,
        },
        {
          select: ["id", "masked_account", "masked_holder", "status", "metadata", "created_at"]
        }
      )

    if (existingDetails.length > 0) {
      if (validatedData.is_default) {
        const customerPaymentPreferenceService =
          req.scope.resolve<CustomerPaymentPreferencesModuleService>(CUSTOMER_PAYMENT_PREFERENCES_MODULE)

        const checkExistingDetails =
          await customerPaymentPreferenceService.listCustomerPaymentPreferences({
            type_id: existingDetails[0].id,
            type: BankAccountType.BANK,
            status: CustomerPaymentPreferenceStatus.ACTIVE,
            customer_id: customerId
          })

        // If same Bank details is not store for the customer then only save the payment preferences
        if (checkExistingDetails.length === 0) {
          await createCustomerPaymentPreferenceWorkflow.run({
            input: {
              customer_id: customerId,
              type: BankAccountType.BANK,
              type_id: existingDetails[0].id,
              status: CustomerPaymentPreferenceStatus.ACTIVE,
              metadata: null,
              created_by: customerId,
              updated_by: null,
              deleted_by: null
            }
          })
        }
      }
      // Only one record with same account number should exist in DB
      return res.json({refund_method: existingDetails[0], is_existing: true})
    }

    verificationResult = await verifyCustomerBankDetailWorkflow(req.scope).run({
      input: {
        customerId,
        accountType: validatedData.type,
        accountNumber: validatedData.account_number,
        ifscCode: validatedData.ifsc_code,
        accountHolderName: validatedData.account_holder_name,
        validationType: RazorpayValidationType.OPTIMIZED,
        notes: notes,
        isDefault: validatedData.is_default ?? false
      }
    })
  }

  if (verificationResult?.result.status === BankAccountVerificationStatus.FAILED) {
    const error =
      verificationResult?.result?.error ??
      'Validation failed, please try again with another details'

    const errorPayload = {
      status: verificationResult?.result.status,
      source: notes,
      customerId: customerId,
      type: validatedData.type,
      errorMessage: error
    }

    logger.error(
      `V3: Bank Validation Failed, for account_type: ${JSON.stringify(errorPayload)}`
    )
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error)
  }

  const status =
    verificationResult?.result?.status === BankAccountVerificationStatus.COMPLETED

  const customerUpiDetail = verificationResult?.result?.customerUpiDetail
  const customerBankDetail = verificationResult?.result?.customerBankDetail

  let maskedResponse

  if (status && customerUpiDetail && isUpi) {
    const retrieveUpiDetails =
      await customerUpiDetailService.retrieveCustomerUpiDetail(customerUpiDetail.id)

    maskedResponse = {
      id: retrieveUpiDetails.id,
      customer_id: customerId,
      type: validatedData.type,
      masked_upi: retrieveUpiDetails.masked_upi,
      created_at: retrieveUpiDetails.created_at,
      updated_at: retrieveUpiDetails.updated_at,
      status: retrieveUpiDetails.status,
      is_existing: false,
    }
  }

  if (status && customerBankDetail && isBank) {
    const retrieveBankDetails =
      await customerBankDetailService.retrieveCustomerBankDetail(customerBankDetail.id)

    maskedResponse = {
      id: retrieveBankDetails.id,
      customer_id: customerId,
      type: validatedData.type,
      masked_account: retrieveBankDetails.masked_account,
      masked_holder: retrieveBankDetails.masked_holder,
      ifsc_code: retrieveBankDetails.ifsc_code,
      created_at: retrieveBankDetails.created_at,
      updated_at: retrieveBankDetails.updated_at,
      status: retrieveBankDetails.status,
      is_existing: false,
    }
  }

  return res.json({refund_method: maskedResponse})
}

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id;

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Unauthorized request., Please login again.'
    )
  }

  const {result} = await listCustomerRefundMethodByCustomerIdNewMapping.run({
    input: {
      customer_id: customerId,
    }
  })

  return res.json({refund_methods: result.refund_methods})
}
