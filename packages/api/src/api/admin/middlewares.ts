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
import { adminPayoutTransactionsMiddlewares } from "./payout-transactions/middlewares"
import { adminRefundMethodsMiddlewares } from "./refund-methods/middlewares"
import { adminRequestsMiddlewares } from "./requests/middlewares"
import { shopifyProductVariantImportMiddlewares } from "./shopify-product-variant-import/middlewares"
import { iconsMiddlewares } from "./icons/middlewares"
import { zonesRoutesMiddlewares } from "./zones/middlewares"
import { controlsRoutesMiddlewares } from "./controls/middlewares"
import { tiersRoutesMiddlewares } from "./tiers/middlewares"
import { videoEncodingJobsMiddlewares } from "./video-encoding-jobs/middlewares"
import { stockLocationRoutesMiddlewares } from "./locations/middlewares"
import { stockLocationExtensionRoutesMiddlewares } from "./stock-location-extension/middlewares"
import { adminStockLocationRoutesMiddlewares } from "./stock-locations/middlewares"
import { adminProductsMiddlewares } from "./products/middlewares"
import { sellerMiddlewares } from "./sellers/middlewares"
import { adminPriceListRequestsMiddlewares } from "./price-list-requests/middlewares"

export const adminMiddlewares: MiddlewareRoute[] = [
  ...adminRequestsMiddlewares,
  ...adminPriceListRequestsMiddlewares,
  ...adminAttributesMiddlewares,
  ...adminBrandsMiddlewares,
  ...adminCustomerBankAccountVerificationMiddlewares,
  ...adminCustomerBankDetailMiddlewares,
  ...adminCustomerUpiDetailMiddlewares,
  ...extraChargeMiddlewares,
  ...extraChargeRuleMiddlewares,
  ...imageConfigurationMiddlewares,
  ...partnerMiddlewares,
  ...adminPayoutTransactionsMiddlewares,
  ...adminRefundMethodsMiddlewares,
  ...shopifyProductVariantImportMiddlewares,
  ...iconsMiddlewares,
  ...zonesRoutesMiddlewares,
  ...controlsRoutesMiddlewares,
  ...tiersRoutesMiddlewares,
  ...videoEncodingJobsMiddlewares,
  ...stockLocationRoutesMiddlewares,  
  ...stockLocationExtensionRoutesMiddlewares,
  ...adminStockLocationRoutesMiddlewares,
  ...adminProductsMiddlewares,
  ...sellerMiddlewares
]
