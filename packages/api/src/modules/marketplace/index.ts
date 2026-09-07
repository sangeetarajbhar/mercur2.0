import { Module } from "@medusajs/framework/utils";

import MarketplaceModuleService from "./service";
import OrderSet from "./models/order-set";

export const MARKETPLACE_MODULE = "marketplace";
export { MarketplaceModuleService, OrderSet };
export * from "./constants/order-statuses";

export default Module(MARKETPLACE_MODULE, {
  service: MarketplaceModuleService,
});
