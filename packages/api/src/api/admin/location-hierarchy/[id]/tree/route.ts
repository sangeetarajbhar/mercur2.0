import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { LOCATION_HIERARCHY_MODULE } from "../../../../../modules/location-hierarchy"
import LocationHierarchyModuleService from "../../../../../modules/location-hierarchy/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(LOCATION_HIERARCHY_MODULE) as LocationHierarchyModuleService
  const hierarchies = await service.listLocationHierarchies({})
  const root = req.params.id
  const children = hierarchies.filter((h: any) => h.parent_location_id === root)
  res.json({
    hierarchy_tree: [
      { id: root, child_location_id: root, parent_location_id: null, children },
    ],
  })
}
