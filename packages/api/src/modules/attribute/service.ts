import { MedusaService } from "@medusajs/framework/utils"

import Attribute from "./models/attribute"
import AttributePossibleValue from "./models/attribute-possible-value"
import AttributeValue from "./models/attribute-value"

class AttributeModuleService extends MedusaService({
  Attribute,
  AttributeValue,
  AttributePossibleValue,
}) {}

export default AttributeModuleService
