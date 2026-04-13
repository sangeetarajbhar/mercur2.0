import type AdminUi from '@mercurjs/core-plugin/modules/admin-ui'
import type Codegen from '@mercurjs/core-plugin/.medusa/server/src/modules/codegen'
import type Commission from '@mercurjs/core-plugin/.medusa/server/src/modules/commission'
import type CustomFields from '@mercurjs/core-plugin/modules/custom-fields'
import type Payout from '@mercurjs/core-plugin/.medusa/server/src/modules/payout'
import type Seller from '@mercurjs/core-plugin/.medusa/server/src/modules/seller'
import type VendorUi from '@mercurjs/core-plugin/modules/vendor-ui'
import type { IStockLocationService } from '@medusajs/framework/types'
import type { IInventoryService } from '@medusajs/framework/types'
import type { IProductModuleService } from '@medusajs/framework/types'
import type { IPricingModuleService } from '@medusajs/framework/types'
import type { IPromotionModuleService } from '@medusajs/framework/types'
import type { ICustomerModuleService } from '@medusajs/framework/types'
import type { ISalesChannelModuleService } from '@medusajs/framework/types'
import type { ICartModuleService } from '@medusajs/framework/types'
import type { IRegionModuleService } from '@medusajs/framework/types'
import type { IApiKeyModuleService } from '@medusajs/framework/types'
import type { IStoreModuleService } from '@medusajs/framework/types'
import type { ITaxModuleService } from '@medusajs/framework/types'
import type { ICurrencyModuleService } from '@medusajs/framework/types'
import type { IPaymentModuleService } from '@medusajs/framework/types'
import type { IOrderModuleService } from '@medusajs/framework/types'
import type { ISettingsModuleService } from '@medusajs/framework/types'
import type { IAuthModuleService } from '@medusajs/framework/types'
import type { IUserModuleService } from '@medusajs/framework/types'
import type { IFulfillmentModuleService } from '@medusajs/framework/types'
import type { INotificationModuleService } from '@medusajs/framework/types'
import type { ICacheService } from '@medusajs/framework/types'
import type { IEventBusModuleService } from '@medusajs/framework/types'
import type { IWorkflowEngineService } from '@medusajs/framework/types'
import type { ILockingModule } from '@medusajs/framework/types'
import type { IFileModuleService } from '@medusajs/framework/types'
import type MoengageAlert from '../../src/modules/moengage_alert'
import type Zone from '../../src/modules/zone'
import type InstantPromises from '../../src/modules/instant-promises'
import type SlotDefinitions from '../../src/modules/slot-definitions'
import type SlotOverrides from '../../src/modules/slot-overrides'
import type StockLocationExtension from '../../src/modules/stock-location-extension'
import type Controls from '../../src/modules/controls'
import type Brand from '../../src/modules/brand'
import type Attribute from '../../src/modules/attribute'
import type SystemConfig from '../../src/modules/system-config'
import type CustomerBankAccountVerification from '../../src/modules/customer-bank-account-verification'
import type CustomerBankDetail from '../../src/modules/customer-bank-detail'
import type CustomerUpiDetail from '../../src/modules/customer-upi-detail'
import type ExtraCharge from '../../src/modules/extra-charge'
import type CartOrderExtraCharge from '../../src/modules/cart-order-extra-charge'
import type CustomerPaymentPreferences from '../../src/modules/customer-payment-preferences'
import type CustomerRefundMethods from '../../src/modules/customer_refund_methods'
import type GoogleLocation from '../../src/modules/google-location'
import type StockLocationSection from '../../src/modules/stock-location-section'
import type StockLocationDocument from '../../src/modules/stock-location-document'
import type StockLocationContact from '../../src/modules/stock-location-contact'
import type ImageConfiguration from '../../src/modules/image-configuration'
import type LocationHierarchy from '../../src/modules/location-hierarchy'
import type Partner from '../../src/modules/partner'
import type Tier from '../../src/modules/tier'
import type VariantImagesSettings from '../../src/modules/variant-images-settings'
import type VideoEncodingJobs from '../../src/modules/video-encoding-jobs'
import type Wishlist from '../../src/modules/wishlist'
import type ExtendPrice from '../../src/modules/pricing-extend'
import type PayoutTransactions from '../../src/modules/payout-transactions'
import type ShopifyProductVariants from '../../src/modules/shopify_product_variant'
import type PromotionExtension from '../../src/modules/promotion_extension'
import type ReturnRefundTypeLink from '../../src/modules/return-refund-type-link'
import type RefundCategory from '../../src/modules/refund-category'

declare module '@medusajs/framework/types' {
  interface ModuleImplementations {
    'admin_ui': InstanceType<(typeof AdminUi)['service']>,
    'codegen': InstanceType<(typeof Codegen)['service']>,
    'commission': InstanceType<(typeof Commission)['service']>,
    'custom_fields': InstanceType<(typeof CustomFields)['service']>,
    'payout': InstanceType<(typeof Payout)['service']>,
    'seller': InstanceType<(typeof Seller)['service']>,
    'vendor_ui': InstanceType<(typeof VendorUi)['service']>,
    'stock_location': IStockLocationService,
    'inventory': IInventoryService,
    'product': IProductModuleService,
    'pricing': IPricingModuleService,
    'promotion': IPromotionModuleService,
    'customer': ICustomerModuleService,
    'sales_channel': ISalesChannelModuleService,
    'cart': ICartModuleService,
    'region': IRegionModuleService,
    'api_key': IApiKeyModuleService,
    'store': IStoreModuleService,
    'tax': ITaxModuleService,
    'currency': ICurrencyModuleService,
    'payment': IPaymentModuleService,
    'order': IOrderModuleService,
    'settings': ISettingsModuleService,
    'auth': IAuthModuleService,
    'user': IUserModuleService,
    'fulfillment': IFulfillmentModuleService,
    'notification': INotificationModuleService,
    'cache': ICacheService,
    'event_bus': IEventBusModuleService,
    'workflows': IWorkflowEngineService,
    'locking': ILockingModule,
    'file': IFileModuleService,
    'moengage_alert': InstanceType<(typeof MoengageAlert)['service']>,
    'zone': InstanceType<(typeof Zone)['service']>,
    'instant_promises': InstanceType<(typeof InstantPromises)['service']>,
    'slot_definitions': InstanceType<(typeof SlotDefinitions)['service']>,
    'slot_overrides': InstanceType<(typeof SlotOverrides)['service']>,
    'stock_location_extension': InstanceType<(typeof StockLocationExtension)['service']>,
    'controls': InstanceType<(typeof Controls)['service']>,
    'brand': InstanceType<(typeof Brand)['service']>,
    'attribute': InstanceType<(typeof Attribute)['service']>,
    'system_config': InstanceType<(typeof SystemConfig)['service']>,
    'customer_bank_account_verification': InstanceType<(typeof CustomerBankAccountVerification)['service']>,
    'customer_bank_detail': InstanceType<(typeof CustomerBankDetail)['service']>,
    'customer_upi_detail': InstanceType<(typeof CustomerUpiDetail)['service']>,
    'extra_charge': InstanceType<(typeof ExtraCharge)['service']>,
    'cart_order_extra_charge': InstanceType<(typeof CartOrderExtraCharge)['service']>,
    'customer_payment_preferences': InstanceType<(typeof CustomerPaymentPreferences)['service']>,
    'customer_refund_methods': InstanceType<(typeof CustomerRefundMethods)['service']>,
    'google_location': InstanceType<(typeof GoogleLocation)['service']>,
    'stock_location_section': InstanceType<(typeof StockLocationSection)['service']>,
    'stock_location_document': InstanceType<(typeof StockLocationDocument)['service']>,
    'stock_location_contact': InstanceType<(typeof StockLocationContact)['service']>,
    'image_configuration': InstanceType<(typeof ImageConfiguration)['service']>,
    'location_hierarchy': InstanceType<(typeof LocationHierarchy)['service']>,
    'partner': InstanceType<(typeof Partner)['service']>,
    'tier': InstanceType<(typeof Tier)['service']>,
    'variant_images_settings': InstanceType<(typeof VariantImagesSettings)['service']>,
    'video_encoding_jobs': InstanceType<(typeof VideoEncodingJobs)['service']>,
    'wishlist': InstanceType<(typeof Wishlist)['service']>,
    'extend_price': InstanceType<(typeof ExtendPrice)['service']>,
    'payout_transactions': InstanceType<(typeof PayoutTransactions)['service']>,
    'shopify_product_variants': InstanceType<(typeof ShopifyProductVariants)['service']>,
    'promotion_extension': InstanceType<(typeof PromotionExtension)['service']>,
    'return_refund_type_link': InstanceType<(typeof ReturnRefundTypeLink)['service']>,
    'refundCategory': InstanceType<(typeof RefundCategory)['service']>
  }
}