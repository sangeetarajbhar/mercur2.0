import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { SLOT_DEFINITIONS_MODULE } from "../../../modules/slot-definitions"
import SlotDefinitionModuleService from "../../../modules/slot-definitions/service"

export const createSlotDefinitionStep = createStep(
  "create-slot-definition",
  async (input: CreateSlotDefinitionStepInput, { container }) => {
    const slotDefinitionService = container.resolve<SlotDefinitionModuleService>(SLOT_DEFINITIONS_MODULE)

    const slotDefinitionPayload = {
      zone_id: input.zone_id,
      slot_key: input.slot_key,
      start_time: input.start_time,
      end_time: input.end_time,
      default_capacity: input.default_capacity,
      is_active: input.is_active,
      cut_off_time: input.cut_off_time,
      created_by: input.created_by || null,
      updated_by: input.created_by || null,
    }

    const slotDefinition = await slotDefinitionService.createSlotDefinitions(slotDefinitionPayload)
    return new StepResponse(slotDefinition)
  }
)

export const createBulkSlotDefinitionStep = createStep(
  "create-bulk-slot-definition",
  async (input: CreateBulkSlotDefinitionStepInput, { container }) => {
    const slotDefinitionService = container.resolve<SlotDefinitionModuleService>(SLOT_DEFINITIONS_MODULE)

    const slotDefinitionsPayload = input.slots.map((slot) => ({
      zone_id: input.zone_id,
      slot_key: slot.slot_key,
      start_time: slot.start_time,
      end_time: slot.end_time,
      default_capacity: slot.default_capacity,
      is_active: slot.is_active,
      cut_off_time: slot.cut_off_time,
      created_by: input.created_by || null,
      updated_by: input.created_by || null,
    }))

    const slotDefinitions = await Promise.all(
      slotDefinitionsPayload.map((payload) => slotDefinitionService.createSlotDefinitions(payload))
    )

    return new StepResponse(slotDefinitions)
  }
)

export type CreateSlotDefinitionStepInput = {
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

export type CreateBulkSlotDefinitionStepInput = {
  zone_id: string
  slots: Array<{
    slot_key: string
    start_time: string
    end_time: string
    default_capacity: number
    is_active: boolean
    cut_off_time: string
    metadata?: any
  }>
  created_by?: string
}
