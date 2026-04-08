import { MedusaService } from "@medusajs/framework/utils"
import { InstantPromises } from "./models/instant_promise"

class InstantPromiseModuleService extends MedusaService({
  InstantPromises,
}) {}

export default InstantPromiseModuleService
