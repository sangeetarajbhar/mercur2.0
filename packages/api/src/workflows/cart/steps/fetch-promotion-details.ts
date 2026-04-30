// import { StepResponse, createStep } from "@medusajs/workflows-sdk"
// import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
// export const fetchPromotionDetailsStep = createStep(
//   "fetch-promotion-details",
//   async (input: { promo_code: string }, { container }) => {
//     const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
//     const promotion = await knex("promotion")
//       .where({ code: input.promo_code })
//       .whereNull("deleted_at")
//       .first()
//     if (!promotion) {
//       throw new Error(`Promotion not found for code: ${input.promo_code}`)
//     }
//     const seller = await knex("seller_seller_promotion_promotion")
//       .select("seller_id")
//       .where({ promotion_id: promotion.id })
//       .whereNull("deleted_at")
//       .first()
//       console.log("Promotion found:", promotion.id, "for seller:", seller?.seller_id)
//     const method = await knex("promotion_application_method")
//       .where({ promotion_id: promotion.id })
//       .first()
//     return new StepResponse({
//       promotion,
//       seller_id: seller?.seller_id,
//       method
//     })
//   }
// )
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

export const fetchPromotionDetailsStep = createStep(
  'fetch-promotion-details',
  async (input: { promo_code: string }, { container }) => {
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Get promotion
    const promotion = await knex('promotion')
      .where({ code: input.promo_code })
      .whereNull('deleted_at')
      .first()

    if (!promotion) {
      throw new Error(`Promotion not found for code: ${input.promo_code}`)
    }

    try {
      var seller = await knex('seller_seller_promotion_promotion')
      .select('seller_id')
      .where({ promotion_id: promotion.id })
      .whereNull('deleted_at')
      .first()
    } catch (error) {
      // admin created promo hence seller not found for seller id
      // set seller_id to null
      // validate cart rules attaches seller_ids if any from promotion_extension
      seller = null
    }

    // Get seller info (for backward compatibility)
    // const seller = await knex('seller_seller_promotion_promotion')
    //   .select('seller_id')
    //   .where({ promotion_id: promotion.id })
    //   .whereNull('deleted_at')
    //   .first()

    // Get application method
    const method = await knex('promotion_application_method')
      .where({ promotion_id: promotion.id })
      .first()

    if (!method) {
      throw new Error(
        `Application method not found for promotion: ${promotion.code}`
      )
    }

    // Get cart-level rules (direct promotion rules)
    const cartRuleLinks = await knex('promotion_promotion_rule').where({
      promotion_id: promotion.id
    })

    const cartRuleIds = cartRuleLinks.map((link) => link.promotion_rule_id)

    let cartRules: any[] = []
    if (cartRuleIds.length > 0) {
      cartRules = await knex('promotion_rule')
        .whereIn('id', cartRuleIds)
        .whereNull('deleted_at')
    }

    // Get cart rule values
    const cartRuleValues = {}
    if (cartRules?.length !== 0) {
      console.log('the cart rules are', cartRules)
      for (const rule of cartRules) {
        const values = await knex('promotion_rule_value')
          .where({ promotion_rule_id: rule.id })
          .whereNull('deleted_at')
        cartRuleValues[rule.id] = values
      }
    }

    // Get item-level rules (through application method)
    const itemRuleLinks = await knex('application_method_target_rules').where({
      application_method_id: method.id
    })

    const itemRuleIds = itemRuleLinks.map((link) => link.promotion_rule_id)

    let itemRules: any[] = []
    if (itemRuleIds.length > 0) {
      itemRules = await knex('promotion_rule')
        .whereIn('id', itemRuleIds)
        .whereNull('deleted_at')
    }

    // Get item rule values
    const itemRuleValues = {}
    if (itemRules?.length !== 0) {
      console.log('the item rules are', itemRules)
      for (const rule of itemRules) {
        const values = await knex('promotion_rule_value')
          .where({ promotion_rule_id: rule.id })
          .whereNull('deleted_at')
        itemRuleValues[rule.id] = values
      }
    }

    return new StepResponse({
      promotion,
      seller_id: seller?.seller_id || null,
      method,
      cartRules:
        cartRules && cartRules.length > 0
          ? cartRules.map((rule) => ({
              ...rule,
              values: cartRuleValues[rule.id] || []
            }))
          : [],
      itemRules:
        itemRules && itemRules.length > 0
          ? itemRules.map((rule) => ({
              ...rule,
              values: itemRuleValues[rule.id] || []
            }))
          : []
    })
  }
)
