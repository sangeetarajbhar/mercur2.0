import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"

import { updateZoneStep } from "../steps"
import { Zone } from "../../../modules/zone/service"

export type UpdateZoneWorkflowInput = {
  zone_id: string
  location_id?: string
  name: string
  description?: string
  postcodes: string[]
  is_active: boolean
  updated_by?: string
}

export type UpdateZoneWorkflowOutput = Zone

export const updateZoneWorkflow = createWorkflow(
  {
    name: "update-zone",
  },
  function (input: UpdateZoneWorkflowInput): WorkflowResponse<UpdateZoneWorkflowOutput> {
    const { oldZone, updatedZone } = updateZoneStep(input)

    const eventData = transform({ oldZone, updatedZone, input }, ({ oldZone, updatedZone, input }) => ({
      entity_type: "zone",
      entity_id: input.zone_id,
      operation: "UPDATE",
      old_entity: oldZone,
      new_entity: updatedZone,
      changed_by: input.updated_by || null,
      metadata: {},
    }))

    emitEventStep({
      eventName: "audit.log",
      data: eventData,
    })

    return new WorkflowResponse(updatedZone as unknown as Zone)
  }
)
