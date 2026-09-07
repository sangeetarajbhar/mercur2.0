import { randomBytes } from 'crypto'

import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

function generateEntityId(prefix: string): string {
  const bytes = randomBytes(16)
  return `${prefix}_${bytes.toString('hex')}`
}

export const insertCartPromotionStep = createStep(
  'insert-cart-promotion',
  async (input: { cart_id: string; promotion_id: string }, { container }) => {
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const existingPromotion = await knex('cart_promotion')
      .where({
        cart_id: input.cart_id,
        promotion_id: input.promotion_id
      })
      .first()

    if (!existingPromotion) {
      // Insert into cart_promotion table
      const [cartPromotion] = await knex('cart_promotion')
        .insert({
          id: generateEntityId('cartpromo'),
          cart_id: input.cart_id,
          promotion_id: input.promotion_id,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null
        })
        .returning('*')


      return new StepResponse(cartPromotion)
    } else if (existingPromotion.deleted_at) {
      await knex('cart_promotion')
        .where({ id: existingPromotion.id })

      await knex('cart_promotion')
        .update({
          deleted_at: null
        }).where({ id: existingPromotion.id })

    } else {
      console.log("promotion is already applied")
    }
  }
)
