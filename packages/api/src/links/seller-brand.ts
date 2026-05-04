import { defineLink } from "@medusajs/framework/utils"
import SellerModule from "@mercurjs/core/modules/seller"

import BrandModule from "../modules/brand"

export default defineLink(
  { linkable: SellerModule.linkable.seller, isList: true },
  { linkable: BrandModule.linkable.brand, isList: true }
)
