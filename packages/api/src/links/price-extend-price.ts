import { defineLink } from "@medusajs/framework/utils"
import ExtendPriceModule from "../modules/pricing-extend"
import PricingModule from "@medusajs/medusa/pricing"

export default defineLink(
{
    linkable:PricingModule.linkable.price,
    isList: true

},
ExtendPriceModule.linkable.extendPrice

)