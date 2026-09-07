import { MedusaService } from "@medusajs/framework/utils"
import { ResizeConfigImageSize, ResizeConfig, ImageSize } from "./models"

class ImageConfigurationModuleService extends MedusaService({
  ResizeConfigImageSize,
  ResizeConfig,
  ImageSize,
}) {}

export default ImageConfigurationModuleService
