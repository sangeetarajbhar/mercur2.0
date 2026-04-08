import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"

import { createZoneStep } from "../steps"
import { Zone } from "../../../modules/zone/service"

export type CreateZoneWorkflowInput = {
  location_id: string
  name: string
  description?: string
  postcodes: string[]
  is_active: boolean
  created_by?: string
  updated_by?: string
}

export type CreateZoneWorkflowOutput = Zone

export const createZoneWorkflow = createWorkflow(
  {
    name: "create-zone",
  },
  function (input: CreateZoneWorkflowInput): WorkflowResponse<CreateZoneWorkflowOutput> {
    const zone = createZoneStep(input)

    const eventData = transform({ zone, input }, ({ zone, input }) => ({
      entity_type: "zone",
      entity_id: zone.id,
      operation: "CREATE",
      new_entity: zone,
      changed_by: input.created_by || null,
      metadata: {},
    }))

    emitEventStep({
      eventName: "audit.log",
      data: eventData,
    })

    return new WorkflowResponse(zone)
  }
)
