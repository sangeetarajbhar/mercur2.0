import { defineLink } from "@medusajs/framework/utils"
import SellerModule from "@mercurjs/seller"
import CartModule from "@medusajs/medusa/cart"

export default defineLink(
  SellerModule.linkable.seller,
  { linkable: CartModule.linkable.lineItem, isList: true }
)