import {
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"

import { updateZoneTimingStep } from "../steps"

export type UpdateZoneTimingWorkflowInput = {
  location_id: string
  updated_by?: string
}

export type UpdateZoneTimingWorkflowOutput = {
  updated_zones_count: number
}

export const updateZoneTimingWorkflow = createWorkflow(
  {
    name: "update-zone-timing",
  },
  function (input: UpdateZoneTimingWorkflowInput): WorkflowResponse<UpdateZoneTimingWorkflowOutput> {
    const result = updateZoneTimingStep(input)
    return new WorkflowResponse(result)
  }
)
