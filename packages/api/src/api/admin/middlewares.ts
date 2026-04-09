import { MiddlewareRoute } from "@medusajs/medusa"

import { adminAttributesMiddlewares } from "./attributes/middlewares"
import { adminBrandsMiddlewares } from "./brands/middlewares"
import { adminCustomerBankAccountVerificationMiddlewares } from "./customer-bank-account-verification/middlewares"
import { adminCustomerBankDetailMiddlewares } from "./customer-bank-detail/middlewares"
import { adminCustomerUpiDetailMiddlewares } from "./customer-upi-detail/middlewares"
import { extraChargeMiddlewares } from "./extra-charge/middlewares"
import { extraChargeRuleMiddlewares } from "./extra-charge-rules/middlewares"
import { imageConfigurationMiddlewares } from "./image-configuration/middlewares"
import { partnerMiddlewares } from "./partner/middlewares"
import { adminRefundMethodsMiddlewares } from "./refund-methods/middlewares"
import { adminRequestsMiddlewares } from "./requests/middlewares"
import { zonesRoutesMiddlewares } from "./zones/middlewares"
import { controlsRoutesMiddlewares } from "./controls/middlewares"
import { stockLocationExtensionRoutesMiddlewares } from "./stock-location-extension/middlewares"

export const adminMiddlewares: MiddlewareRoute[] = [
  ...adminRequestsMiddlewares,
  ...adminAttributesMiddlewares,
  ...adminBrandsMiddlewares,
  ...adminCustomerBankAccountVerificationMiddlewares,
  ...adminCustomerBankDetailMiddlewares,
  ...adminCustomerUpiDetailMiddlewares,
  ...extraChargeMiddlewares,
  ...extraChargeRuleMiddlewares,
  ...imageConfigurationMiddlewares,
  ...partnerMiddlewares,
  ...adminRefundMethodsMiddlewares,
  ...zonesRoutesMiddlewares,
  ...controlsRoutesMiddlewares,
  ...stockLocationExtensionRoutesMiddlewares,
]
