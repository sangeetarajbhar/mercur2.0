import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"

import { createSlotDefinitionStep } from "../steps"

export type CreateSlotDefinitionWorkflowInput = {
  zone_id: string
  slot_key: string
  start_time: string
  end_time: string
  default_capacity: number
  is_active: boolean
  cut_off_time: string
  metadata?: any
  created_by?: string
}

export type CreateSlotDefinitionWorkflowOutput = {
  id: string
  zone_id: string
  slot_key: string
  start_time: string
  end_time: string
  default_capacity: number
  is_active: boolean
  cut_off_time: string
  metadata: any
  created_at: Date
  updated_at: Date
  created_by?: string
  updated_by?: string
}

export const createSlotDefinitionWorkflow = createWorkflow(
  {
    name: "create-slot-definition",
  },
  function (input: CreateSlotDefinitionWorkflowInput) {
    const slotDefinition = createSlotDefinitionStep(input)

    const eventData = transform({ slotDefinition, input }, ({ slotDefinition, input }) => ({
      entity_type: "slot_definition",
      entity_id: slotDefinition.id,
      operation: "CREATE",
      new_entity: slotDefinition,
      changed_by: input.created_by || null,
      metadata: { zone_id: input.zone_id },
    }))

    emitEventStep({
      eventName: "audit.log",
      data: eventData,
    })

    return new WorkflowResponse(slotDefinition)
  }
)
