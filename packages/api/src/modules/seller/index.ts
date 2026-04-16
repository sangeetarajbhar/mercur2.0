import { Module } from "@medusajs/framework/utils";

import SellerModuleService from "./service";
import VariantSellerService from "./variant-seller-service";
import { MercurModules } from "@mercurjs/types";

export const SELLER_MODULE = MercurModules.SELLER;
export { SellerModuleService, VariantSellerService };
export * from "./utils";

export default Module(MercurModules.SELLER, { service: SellerModuleService });
