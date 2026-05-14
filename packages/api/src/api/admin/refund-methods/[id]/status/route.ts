import { CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE } from '../../../../../modules/customer-bank-account-verification'
import CustomerBankAccountVerificationService from '../../../../../modules/customer-bank-account-verification/service'
import { CUSTOMER_REFUND_METHODS_MODULE } from '../../../../../modules/customer_refund_methods'
import CustomerRefundMethodModuleService from '../../../../../modules/customer_refund_methods/service'

import {
  AuthenticatedMedusaRequest,
  MedusaResponse
} from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'

interface data {
  refund_method_status: boolean,
  is_account_verified: boolean,
  bank_account_verification_status: string,
  bank_account_status: string
  failure_reason: string | null
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  // @ToDO this endpoint is only for testing purpose on stage where is will update refund method status & bank account verification status
  const refundMethodId = req.params.id

  const body = req.body as data

  // if (!body.refund_method_status || !body.is_account_verified || !body.bank_account_verification_status || !body.bank_account_status) {
  //   throw new MedusaError(
  //     MedusaError.Types.NOT_FOUND,
  //     'Fields are required: refund_method_status, is_account_verified, bank_account_verification_status, bank_account_status'
  //   )
  // }

  const customerRefundMethodService =
    req.scope.resolve<CustomerRefundMethodModuleService>(
      CUSTOMER_REFUND_METHODS_MODULE
    )

  const refundMethod =
    await customerRefundMethodService.retrieveCustomerRefundMethod(
      refundMethodId
    )

  if (!refundMethod) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Refund method not found'
    )
  }

  const customerBankAccountVerificationSerivce =
    req.scope.resolve<CustomerBankAccountVerificationService>(
      CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE
    )

  const customerBankAccountVerification =
    await customerBankAccountVerificationSerivce.listCustomerBankAccountVerifications(
      {
        customer_refund_method_id: refundMethodId
      }
    )

  if (!customerBankAccountVerification.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer Bank Account with refund method id: ${refundMethodId} not found`
    )
  }

  const updateRefundMethodStatus =
    await customerRefundMethodService.updateCustomerRefundMethods({
      id: refundMethodId,
      status: body.refund_method_status,
      is_account_verified: body.is_account_verified
    })

  const updateCustomerBankAccountVerification =
    await customerBankAccountVerificationSerivce.updateCustomerBankAccountVerifications(
      {
        selector: {
          customer_refund_method_id: refundMethodId
        },
        data: {
          status: body.bank_account_verification_status as "created" | "completed" | "failed",
          bank_account_status: body.bank_account_status,
          failure_reason: body?.failure_reason ?? null
        }
      }
    )

  res.json({
    refund_method: updateRefundMethodStatus,
    customer_bank_account_verification: updateCustomerBankAccountVerification
  })
}
