import { MedusaService } from "@medusajs/framework/utils"
import { LocationHierarchy } from "./models/location-hierarchy"

class LocationHierarchyModuleService extends MedusaService({
  LocationHierarchy,
}) {}

export default LocationHierarchyModuleService
