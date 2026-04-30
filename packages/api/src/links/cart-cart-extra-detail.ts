import BrandModule from "../modules/brand"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"
import CartModule from "@medusajs/medusa/cart"
import CartExtraDetailModule from "../modules/cart-extra-detail"

export default defineLink(
    CartModule.linkable.cart,
    CartExtraDetailModule.linkable.cartExtraDetail
)