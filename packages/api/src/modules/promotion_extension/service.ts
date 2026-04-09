import { MedusaService } from "@medusajs/framework/utils"
import promotionExtension from "./models/custom"

class PromotionModuleService extends MedusaService({
  promotionExtension,
}){
  createCustoms = async (data: any) => {
    let extensions = await this.createPromotionExtensions(data)
    return extensions 
  }

  updateCustoms = async (id: string, data: any) => {
    let extensions = await this.updatePromotionExtensions({ id, ...data })
    return extensions 
  }

  deleteCustoms = async (id: string) => {
    return await this.deletePromotionExtensions(id)
  }

  softDeleteCustoms = async (id: string) => {
    return await this.softDeletePromotionExtensions(id)
  }
}

export default PromotionModuleService

