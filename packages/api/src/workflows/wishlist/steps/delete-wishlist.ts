import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { DeleteWishlistDTO } from '../../../types'
import { WISHLIST_MODULE, getWishlistFromCustomerId } from '../../../modules/wishlist'

export const deleteWishlistEntryStep = createStep(
  'delete-wishlist',
  async (input: DeleteWishlistDTO, { container }) => {
    const { reference_id } = input
    const wishlist = await getWishlistFromCustomerId(container, input.customer_id)
    const id = wishlist?.id || '';
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    if(id){
      await link.dismiss([
        {
          [WISHLIST_MODULE]: {
            wishlist_id: id
          },
          [Modules.PRODUCT]: {
            product_id: reference_id
          }
        }
      ])
    }

    return new StepResponse({ id, reference_id })
  }
)

