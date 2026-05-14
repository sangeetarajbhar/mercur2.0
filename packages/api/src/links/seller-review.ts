import { defineLink } from "@medusajs/framework/utils"
import SellerModule from "@mercurjs/core-plugin/modules/seller"

import ReviewModule from "../modules/review"

export default defineLink(SellerModule.linkable.seller, {
  linkable: ReviewModule.linkable.review,
  isList: true,
})

