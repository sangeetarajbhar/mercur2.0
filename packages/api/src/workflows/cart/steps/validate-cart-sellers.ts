import { CartLineItemDTO } from '@medusajs/framework/types'
import {
  ContainerRegistrationKeys,
  MedusaError
} from '@medusajs/framework/utils'
import { createStep } from '@medusajs/framework/workflows-sdk'

import {StoreStatus} from "../../../types/seller";

import productSellerLink from '@mercurjs/core/links/product-seller-link'
import { SellerStatus } from "@mercurjs/types";

type LineItemWithProductId = Pick<CartLineItemDTO, 'product_id'>

export const validateCartSellersStep = createStep(
  'validate-cart-sellers',
  async (input: { line_items: LineItemWithProductId[] }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    if (!input.line_items?.length) {
      return
    }

    const productIds = input.line_items.map((item) => item.product_id)

    const { data: sellerProducts } = await query.graph({
      entity: productSellerLink.entryPoint,
      fields: ['seller_id', 'product_id', 'seller.status'],
      filters: {
        product_id: productIds
      }
    })

    console.log('productIds: ', productIds)
    console.log('sellerProducts: ', sellerProducts)

    const hasInactiveSellers = sellerProducts.some(
      (sp) => sp.seller.status !== SellerStatus.OPEN
    )

    if (hasInactiveSellers) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        'Some products in the cart belong to inactive sellers'
      )
    }
  }
)
