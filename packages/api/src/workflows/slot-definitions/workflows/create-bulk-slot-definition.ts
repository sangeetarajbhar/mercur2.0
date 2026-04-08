import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"

import { createBulkSlotDefinitionStep } from "../steps"

export type CreateBulkSlotDefinitionWorkflowInput = {
  zone_id: string
  slots: Array<{
    slot_key: string
    start_time: string
    end_time: string
    default_capacity: number
    is_active: boolean
    cut_off_time: string
    metadata?: Record<string, unknown>
  }>
  created_by?: string
}

export type CreateBulkSlotDefinitionWorkflowOutput = Array<{
  id: string
  zone_id: string
  slot_key: string
  start_time: string
  end_time: string
  default_capacity: number
  is_active: boolean
  cut_off_time: string
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
  created_by?: string
  updated_by?: string
}>

export const createBulkSlotDefinitionWorkflow = createWorkflow(
  {
    name: "create-bulk-slot-definition",
  },
  function (input: CreateBulkSlotDefinitionWorkflowInput) {
    const slotDefinitions = createBulkSlotDefinitionStep(input)

    const eventData = transform({ slotDefinitions, input }, ({ slotDefinitions, input }) => ({
      entity_type: "slot_definition_bulk",
      entity_id: input.zone_id,
      operation: "CREATE_BULK",
      new_entity: slotDefinitions,
      changed_by: input.created_by || null,
      metadata: {
        zone_id: input.zone_id,
        count: slotDefinitions.length,
        slot_ids: slotDefinitions.map((s: { id: string }) => s.id),
      },
    }))

    emitEventStep({
      eventName: "audit.log",
      data: eventData,
    })

    return new WorkflowResponse(slotDefinitions)
  }
)
