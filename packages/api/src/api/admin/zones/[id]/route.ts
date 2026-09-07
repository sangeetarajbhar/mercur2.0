import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateZoneWorkflow, UpdateZoneWorkflowInput } from "../../../../workflows/zone/workflows/update-zone"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const { data: zones } = await query.graph({
      entity: "zone",
      fields: ["*"],
      filters: { id },
    })

    if (!zones || zones.length === 0) {
      return res.status(404).json({
        error: "Zone not found",
      })
    }

    const zone = zones[0]

    const { data: instantPromises } = await query.graph({
      entity: "instant_promise",
      fields: ["*"],
      filters: { zone_id: id },
    })

    const zoneWithPromises = {
      ...zone,
      instant_promises: instantPromises || [],
    }

    res.json({ zone: zoneWithPromises })
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch zone",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const body = req.validatedBody as Omit<UpdateZoneWorkflowInput, "zone_id" | "updated_by">
    const workflowInput: UpdateZoneWorkflowInput = {
      ...body,
      zone_id: id,
      updated_by: req.auth_context.actor_id,
    }

    const { result } = await updateZoneWorkflow(req.scope).run({
      input: workflowInput,
    })

    res.json({
      message: "Zone updated successfully",
      zone: result,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to update zone",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
