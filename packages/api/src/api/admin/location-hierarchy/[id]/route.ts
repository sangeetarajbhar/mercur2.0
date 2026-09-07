import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { LOCATION_HIERARCHY_MODULE } from "../../../../modules/location-hierarchy"
import LocationHierarchyModuleService from "../../../../modules/location-hierarchy/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(LOCATION_HIERARCHY_MODULE) as LocationHierarchyModuleService
  const locationHierarchy = await service.retrieveLocationHierarchy(req.params.id)
  return res.json({ locationHierarchy })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(LOCATION_HIERARCHY_MODULE) as LocationHierarchyModuleService
  const [locationHierarchy] = await service.updateLocationHierarchies([{ id: req.params.id, ...(req.body as object) }])
  return res.json({ locationHierarchy })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(LOCATION_HIERARCHY_MODULE) as LocationHierarchyModuleService
  await service.softDeleteLocationHierarchies(req.params.id)
  return res.status(200).json({ message: "Location hierarchy deleted successfully" })
}
