import { defineLink } from "@medusajs/framework/utils"
import CartModule from "@medusajs/medusa/cart"
import CartDeliveryDetailModule from "../modules/cart-delivery-detail"

export default defineLink(
    CartModule.linkable.lineItem,
    {
        linkable: CartDeliveryDetailModule.linkable.cartDeliveryDetail,
        isList: true,
        filterable: ["promise_key"],
    },
    {
        database: {
            table: "cart_item_cart_delivery_detail",
        },
    }
)