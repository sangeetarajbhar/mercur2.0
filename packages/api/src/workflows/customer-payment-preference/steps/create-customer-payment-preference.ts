import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import {
  CUSTOMER_PAYMENT_PREFERENCES_MODULE,
} from "../../../modules/customer-payment-preferences"
import CustomerPaymentPreferencesModuleService from "../../../modules/customer-payment-preferences/service"

export const createCustomerPaymentPreferenceStep = createStep(
  { name: "create-customer-payment-preference-step" },
  async (input: Record<string, any>, { container }) => {
    const service: CustomerPaymentPreferencesModuleService = container.resolve(
      CUSTOMER_PAYMENT_PREFERENCES_MODULE
    )
    const record = await service.createCustomerPaymentPreferences(input)
    return new StepResponse(record, record.id)
  },
  async (id: string, { container }) => {
    if (!id) return
    const service: CustomerPaymentPreferencesModuleService = container.resolve(
      CUSTOMER_PAYMENT_PREFERENCES_MODULE
    )
    await service.softDeleteCustomerPaymentPreferences(id)
  }
)
