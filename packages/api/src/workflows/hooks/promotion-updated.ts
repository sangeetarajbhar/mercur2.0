import { updatePromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { invalidatePromotionCacheById } from "../../shared/utils/promotion-cache"
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { 
  updateCustomFromPromotionWorkflow, 
  UpdateCustomFromPromotionWorkflowInput,
} from "../promotions/workflows"

/**
 * Workflow hook to invalidate promotion cache and update promotion extensions when a promotion is updated
 */
try {
  if (updatePromotionsWorkflow?.hooks?.promotionsUpdated) {
    updatePromotionsWorkflow.hooks.promotionsUpdated(
      async ({ promotions, additional_data }, { container }) => {
        try {
          
          if (!promotions || promotions.length === 0) {
            console.log("No promotions to invalidate cache for")
            return
          }
          
          const query = container.resolve(ContainerRegistrationKeys.QUERY)
          
          // Update promotion extension and invalidate cache for each updated promotion
          for (const promotion of promotions) {
            try {
              // Invalidate cache
              await invalidatePromotionCacheById(promotion.id, container)

              // Find the linked promotion extension
              const {
                data: [link]
              } = await query.graph({
                entity: 'promotion_promotion_extension',
                fields: ['id', 'promotion.*', 'promotion_extension.*'],
                filters: {
                  promotion_id: promotion.id
                }
              })

              if (link && link.promotion_extension) {

                
                // If additional_data is not provided (e.g., editing from default Medusa UI),
                // preserve existing values instead of resetting to defaults
                const dataToUpdate = additional_data || {
                  cart_sub_total: link.promotion_extension.cart_sub_total,
                  promo_code_upper_limit: link.promotion_extension.promo_code_upper_limit,
                  seller_ids: link.promotion_extension.seller_ids,
                  first_customer: link.promotion_extension.first_customer,
                  for_seller: link.promotion_extension.for_seller
                }

                
                const workflow = updateCustomFromPromotionWorkflow(container)
                await workflow.run({
                  input: {
                    promotion,
                    promotion_extension_id: link.promotion_extension.id,
                    additional_data: dataToUpdate,
                  } as UpdateCustomFromPromotionWorkflowInput,
                })
              } else {
                console.log("No promotion extension found for promotion:", promotion.id)
              }
            } catch (error) {
              console.error(` Error updating promotion extension for ID ${promotion.id}:`, error)
            }
          }
        } catch (hookError) {
          console.error(" Error in promotionsUpdated hook:", hookError)
        }
      }
    )
  } else {
    console.log(" updatePromotionsWorkflow.hooks.promotionsUpdated not available")
  }
} catch (error) {
  console.error(" Error registering promotion updated hook:", error)
}

/**
 * Note: batchPromotionRulesWorkflow hooks will need to be implemented
 * when the workflow structure is available
 */


