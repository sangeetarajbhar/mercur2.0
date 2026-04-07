import { MedusaService } from "@medusajs/framework/utils"
import { CustomerPaymentPreferences } from "./models/customer-payment-preferences"

class CustomerPaymentPreferencesModuleService extends MedusaService({
  CustomerPaymentPreferences,
}) {}

export default CustomerPaymentPreferencesModuleService
