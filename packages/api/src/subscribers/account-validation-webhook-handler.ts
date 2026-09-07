import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'

import { CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE } from '../modules/customer-bank-account-verification'
import { CUSTOMER_REFUND_METHODS_MODULE } from '../modules/customer_refund_methods'
import CustomerBankAccountVerificationService from '../modules/customer-bank-account-verification/service'
import CustomerRefundMethodModuleService from '../modules/customer_refund_methods/service'
import { encryptForStorage } from '../modules/customer_refund_methods/utils/encryption'
import { BankAccountVerificationStatus } from '../utils/constants/bank_account_verification'
import { AccountValidationEvents } from '../types/event/account-validation-events'

const log = (msg: string, meta?: object) =>
  console.log('[AccountValidationWebhookHandler]', msg, meta ?? '')

type WebhookPayload = {
  provider: string
  payload: {
    data: Record<string, any>
    rawData?: Buffer | string
    headers?: Record<string, any>
  }
}

/**
 * Subscriber for Razorpay account validation webhooks.
 *
 * Listens to ACCOUNT_VALIDATION_WEBHOOK_RECEIVED (emitted by the API after signature
 * validation). Finds the verification by fund_account_id, updates status/fields, and
 * optionally updates customer_refund_method.is_account_verified.
 *
 * Payload: entity = payload["fund_account.validation"].entity
 * - entity.status: "completed" | "failed"
 * - entity.results: { account_status, registered_name, details, name_match_score }
 * - entity.fund_account.id: fund_account_id (used for lookup; reference_id is NOT in webhook)
 */
export default async function handleAccountValidationWebhook({
  event,
  container,
}: SubscriberArgs<WebhookPayload>) {
  const { provider, payload } = event.data || {}
  const data = payload?.data

  log('Subscriber triggered', { provider, hasData: !!data, event: data?.event })

  if (!data || typeof data !== 'object') {
    log('validation webhook: No payload.data; skipping: ', { data })
    return
  }

  console.dir(data, { depth: null, colors: true })
  log('Payload summary', {
    event: data?.event,
    hasValidationEntity: !!data?.payload?.['fund_account.validation']?.entity,
    contains: data?.contains,
  })
  // Parse entity from Razorpay structure: payload["fund_account.validation"].entity
  const faValidation = data.payload['fund_account.validation']
  const entity = faValidation?.entity

  // Helpful structured log to see the core fields arriving from Razorpay
  if (entity) {
    log('Parsed entity', {
      fund_account_id: entity?.fund_account?.id,
      status: entity?.status,
      utr: entity?.utr,
      results: {
        account_status: entity?.validation_results?.account_status,
        registered_name: entity?.validation_results?.registered_name,
        details: entity?.validation_results?.details,
        name_match_score: entity?.validation_results?.name_match_score,
      },
    })
  }

  if (!entity || typeof entity !== 'object') {
    log('Missing payload["fund_account.validation"].entity; skipping', {
      keys: data ? Object.keys(data) : [],
    })
    return
  }

  const fundAccountId = entity.fund_account?.id
  if (!fundAccountId) {
    log('Missing entity.fund_account.id; cannot look up verification', {
      entityId: entity.id,
    })
    return
  }

  log('Resolving verification by fund_account_id', {
    fund_account_id: fundAccountId,
    entity_status: entity.status,
    registered_name: entity?.validation_results?.registered_name,
  })

  const verificationService = container.resolve<CustomerBankAccountVerificationService>(
    CUSTOMER_BANK_ACCOUNT_VERIFICATION_MODULE
  )

  let list: any[] = []
  try {
    list = await verificationService.listCustomerBankAccountVerifications({
      fund_account_id: fundAccountId,
    })
  } catch (err: any) {
    log('listCustomerBankAccountVerifications failed', {
      fund_account_id: fundAccountId,
      registered_name: entity?.validation_results?.registered_name,
      error: err?.message,
    })
    return
  }

  if (!list || list.length === 0) {
    log('No verification found for fund_account_id, ', {
      fund_account_id: fundAccountId,
      registered_name: entity?.validation_results?.registered_name,
    })
    return
  }

  if (list.length > 1) {
    log('Multiple verifications for same fund_account_id; using first', {
      fund_account_id: fundAccountId,
      registered_name: entity?.validation_results?.registered_name,
      count: list.length,
    })
  }

  const verification = list[0]
  const results = entity.status_details || {}
  log('Entity Results: ', {
    fund_account_id: fundAccountId,
    registered_name: entity?.validation_results?.registered_name,
    status_details: results,
  })

  // failure_reason: only when status is "failed"; use entity.results.details if it's a real string, else generic
  let failureReason: string | null = null
  if (entity.status === BankAccountVerificationStatus.FAILED) {
    const errorMessageDescription = results?.description
    if (errorMessageDescription) {
      failureReason = errorMessageDescription
    } else {
      failureReason = 'Validation failed, please try again with different details'
    }

    log('Bank-upi validation failed: ', {
      verification_id: verification.id,
      fund_account_id: fundAccountId,
      status: entity.status,
      failureReason: failureReason,
      bank_account_status: entity?.validation_results?.account_status ?? null,
      registered_name: entity?.validation_results?.registered_name,
    })
  }

  if (entity.status !== BankAccountVerificationStatus.FAILED && entity?.validation_results?.account_status !== 'active') {
    const errorMessageDescription = entity?.validation_results?.details ?? entity?.validation_results?.account_status
    if (errorMessageDescription) {
      failureReason = errorMessageDescription
    } else {
      failureReason = 'Given details is invalid, please try again with different details'
    }

    log('Bank-upi invalid details: ', {
      verification_id: verification.id,
      fund_account_id: fundAccountId,
      status: entity.status,
      failureReason: failureReason,
      bank_account_status: entity?.validation_results?.account_status ?? null,
      validation_results_details: entity?.validation_results?.details ?? null,
      registered_name: entity?.validation_results?.registered_name,
    })
  }

  const rawEnc = encryptForStorage(JSON.stringify(data))

  const updateData: Record<string, any> = {
    status: entity.status,
    bank_account_status: entity?.validation_results?.account_status ?? null,
    registered_name: entity?.validation_results?.registered_name ?? null,
    utr: entity.utr ?? null,
    failure_reason: failureReason,
    raw_gateway_response_enc: rawEnc,
    updated_by: 'user_01KAB6PNKF7HPNV58PCND0A40X', // live admin user id
  }

  log('Updating verification', {
    verification_id: verification.id,
    fund_account_id: fundAccountId,
    status: updateData.status,
    bank_account_status: updateData.bank_account_status,
    registered_name: entity?.validation_results?.registered_name,
  })

  try {
    await verificationService.updateCustomerBankAccountVerifications({
      id: verification.id,
      ...updateData,
    })
  } catch (err: any) {
    log('updateCustomerBankAccountVerifications failed', {
      verification_id: verification.id,
      registered_name: entity?.validation_results?.registered_name,
      error: err?.message,
    })
    return
  }

  // If linked to a refund method, set is_account_verified
  const customerRefundMethodId = verification.customer_refund_method_id
  if (customerRefundMethodId) {
    const isVerified =
      entity.status === BankAccountVerificationStatus.COMPLETED && entity?.validation_results?.account_status === 'active'

    log('Updating customer_refund_method.is_account_verified', {
      customer_refund_method_id: customerRefundMethodId,
      is_account_verified: isVerified,
      registered_name: entity?.validation_results?.registered_name,
    })

    try {
      const refundMethodService = container.resolve<CustomerRefundMethodModuleService>(
        CUSTOMER_REFUND_METHODS_MODULE
      )
      await refundMethodService.updateCustomerRefundMethods({
        id: customerRefundMethodId,
        is_account_verified: isVerified
      })
    } catch (err: any) {
      log('updateCustomerRefundMethods (is_account_verified) failed', {
        customer_refund_method_id: customerRefundMethodId,
        registered_name: entity?.validation_results?.registered_name,
        error: err?.message,
      })
    }
  } else {
    log('Verification not linked to customer_refund_method; skipping is_account_verified update')
  }

  log('Account validation webhook processed', {
    verification_id: verification.id,
    status: entity.status,
    fund_account_id: fundAccountId,
    registered_name: entity?.validation_results?.registered_name,
  })
}

export const config: SubscriberConfig = {
  event: AccountValidationEvents.WEBHOOK_RECEIVED,
}
