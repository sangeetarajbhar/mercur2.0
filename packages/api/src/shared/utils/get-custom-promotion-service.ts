import { Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/framework/types"
import CustomPromotionModuleService from "../../modules/promotion-custom/service"

/**
 * Get CustomPromotionModuleService instance
 * This ensures we use our custom service everywhere for consistent behavior
 * including custom computeActions and listActivePromotions methods
 * 
 * @param container - Medusa container/scope
 * @returns CustomPromotionModuleService instance with all custom methods
 */
export function getCustomPromotionService(container: any): IPromotionModuleService {
  const baseService = container.resolve(Modules.PROMOTION) as IPromotionModuleService
  return new CustomPromotionModuleService(baseService, container) as any
}

