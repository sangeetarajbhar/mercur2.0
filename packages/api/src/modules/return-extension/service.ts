import { MedusaService } from "@medusajs/framework/utils"
import { ReturnExtension } from "./models/return_extension"

class ReturnExtensionModuleService extends MedusaService({
  ReturnExtension,
}) {}

export default ReturnExtensionModuleService
