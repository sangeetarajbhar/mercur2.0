import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { CUSTOMER_BANK_MODULE } from '../../../modules/customer-bank-detail'
import CustomerBankModuleService from '../../../modules/customer-bank-detail/service'
import { CUSTOMER_PAYMENT_PREFERENCES_MODULE } from '../../../modules/customer-payment-preferences'
import CustomerPaymentPreferencesModuleService from '../../../modules/customer-payment-preferences/service'
import { CUSTOMER_UPI_MODULE } from '../../../modules/customer-upi-detail'
import CustomerUpiModuleService from '../../../modules/customer-upi-detail/service'
import { decryptFromStorage } from '../../../modules/customer_refund_methods/utils/encryption'
import {
  BankAccountType,
  CustomerBankDetailStatus,
  CustomerPaymentPreferenceStatus,
  CustomerUpiDetailStatus
} from '../../../utils/constants/bank_account_verification'
import { listCustomerRefundMethodByCustomerIdNewMappingInput } from '../workflows/list-customer-refund-method-by-customer-id-new-mapping'

export const listCustomerRefundMethodByCustomerIdNewMappingStep = createStep(
  'list-customer-refund-method-by-customer-id-new-mapping-step',
  async (
    input: listCustomerRefundMethodByCustomerIdNewMappingInput,
    { container }
  ) => {
    const customerUpiDetailService =
      container.resolve<CustomerUpiModuleService>(CUSTOMER_UPI_MODULE)

    const customerBankDetailService =
      container.resolve<CustomerBankModuleService>(CUSTOMER_BANK_MODULE)

    const customerPaymentPreferenceService =
      container.resolve<CustomerPaymentPreferencesModuleService>(
        CUSTOMER_PAYMENT_PREFERENCES_MODULE
      )

    const refund_methods: any[] = []

    const lists =
      await customerPaymentPreferenceService.listCustomerPaymentPreferences(
        {
          customer_id: input.customer_id,
          status: CustomerPaymentPreferenceStatus.ACTIVE
        },
        {
          select: ['id', 'customer_id', 'type', 'type_id', 'status']
        }
      )

    if (lists.length === 0) {
      return new StepResponse({ refund_methods })
    }

    const { bankIds, upiIds } = lists.reduce(
      (acc, item) => {
        if (item.type === BankAccountType.BANK) {
          acc.bankIds.push(item.type_id)
        } else if (item.type === BankAccountType.UPI) {
          acc.upiIds.push(item.type_id)
        }
        return acc
      },
      {
        bankIds: [] as string[],
        upiIds: [] as string[]
      }
    )

    if (bankIds.length > 0) {
      const bankList = await customerBankDetailService.listCustomerBankDetails(
        {
          id: bankIds,
          status: CustomerBankDetailStatus.ACTIVE
        },
        {
          select: [
            'id',
            'account_number_enc',
            'account_holder_enc',
            'ifsc_code',
            'masked_holder',
            'masked_account',
            'status'
          ]
        }
      )

      if (bankList.length > 0) {
        const decryptedBanks = bankList.map((bank) => ({
          id: bank.id,
          type: BankAccountType.BANK,

          // decrypted values
          account_number: decryptFromStorage(bank.account_number_enc),
          account_holder_name: decryptFromStorage(bank.account_holder_enc),

          // safe values
          masked_account: bank.masked_account,
          masked_holder: bank.masked_holder,
          ifsc_code: bank.ifsc_code,
          status: bank.status
        }))

        refund_methods.push(...decryptedBanks)
      }
    }

    if (upiIds.length > 0) {
      const upiList = await customerUpiDetailService.listCustomerUpiDetails(
        {
          id: upiIds,
          status: CustomerUpiDetailStatus.ACTIVE
        },
        {
          select: ['id', 'upi_id_enc', 'masked_upi', 'status']
        }
      )

      if (upiList.length > 0) {
        const decryptedUpiList = upiList.map((upi) => ({
          id: upi.id,
          type: BankAccountType.UPI,
          upi_id: decryptFromStorage(upi.upi_id_enc),
          masked_upi: upi.masked_upi
        }))

        refund_methods.push(...decryptedUpiList)
      }
    }

    return new StepResponse({ refund_methods })
  }
)
