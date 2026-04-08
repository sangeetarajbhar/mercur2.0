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
import type Zone from '../../src/modules/zone'
import type InstantPromises from '../../src/modules/instant-promises'
import type SlotDefinitions from '../../src/modules/slot-definitions'
import type SlotOverrides from '../../src/modules/slot-overrides'
import type StockLocationExtension from '../../src/modules/stock-location-extension'
import type Controls from '../../src/modules/controls'

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
    'zone': InstanceType<(typeof Zone)['service']>,
    'instant_promises': InstanceType<(typeof InstantPromises)['service']>,
    'slot_definitions': InstanceType<(typeof SlotDefinitions)['service']>,
    'slot_overrides': InstanceType<(typeof SlotOverrides)['service']>,
    'stock_location_extension': InstanceType<(typeof StockLocationExtension)['service']>,
    'controls': InstanceType<(typeof Controls)['service']>
  }
}