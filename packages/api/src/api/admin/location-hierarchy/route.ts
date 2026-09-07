import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { LOCATION_HIERARCHY_MODULE } from "../../../modules/location-hierarchy"
import LocationHierarchyModuleService from "../../../modules/location-hierarchy/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(LOCATION_HIERARCHY_MODULE) as LocationHierarchyModuleService
  const { parent_location_id, child_location_id, promise_minutes } = req.body as Record<string, any>
  const locationHierarchy = await service.createLocationHierarchies({
    parent_location_id,
    child_location_id,
    promise_minutes: promise_minutes ?? 0,
  })
  return res.json({ locationHierarchy })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(LOCATION_HIERARCHY_MODULE) as LocationHierarchyModuleService
  const data = await service.listLocationHierarchies({})
  return res.json({ data, total: data.length, offset: 0, limit: data.length })
}
