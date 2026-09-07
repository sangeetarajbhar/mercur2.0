import { MedusaService } from "@medusajs/framework/utils"
import { SlotDefinitions } from "./models/slot_definition"

class SlotDefinitionModuleService extends MedusaService({
  SlotDefinitions,
}) {}

export default SlotDefinitionModuleService
