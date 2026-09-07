import { MedusaService } from "@medusajs/framework/utils"
import { SlotOverrides } from "./models/slot_override"

class SlotOverrideModuleService extends MedusaService({
  SlotOverrides,
}) {}

export default SlotOverrideModuleService
