import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

interface UpdateReturnRefundStatusInput {
  returnId: string
  internal_note?: string
  updated_by?: string
}

export const updateReturnRefundStatusStep = createStep(
  "update-return-refund-status",
  async (input: UpdateReturnRefundStatusInput, { container }): Promise<any> => {
    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    
    // Get the current return data before updating (for potential rollback)
    const previousReturn = await knex('return')
      .where({ id: input.returnId })
      .first()
    
    if (!previousReturn || previousReturn.status !== 'received') {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Return with id ${input.returnId} is not received`)
    }
    
    // Directly update the return status in the database
    const updateData: any = {
      status: 'refunded',
      updated_at: knex.fn.now()
    }
    
    // Add internal_note if provided
    if (input.internal_note) {
      updateData.internal_note = input.internal_note
    }
    
    await knex('return')
      .where({ id: input.returnId })
      .update(updateData)
    
    return new StepResponse(
      { 
        id: input.returnId, 
        status: 'refunded',
        internal_note: input.internal_note 
      },
      previousReturn // Store previous state for rollback
    )
  },
  async (previousReturn: any, { container }) => {
    // Rollback: restore the previous return state
    if (previousReturn) {
      const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      
      await knex('return')
        .where({ id: previousReturn.id })
        .update({
          status: previousReturn.status,
          internal_note: previousReturn.internal_note,
          updated_at: knex.fn.now()
        })
    }
  }
)

export const updateReturnRefundStatusWorkflow = createWorkflow(
  "update-return-refund-status-workflow",
  (input: UpdateReturnRefundStatusInput) => {
    const result = updateReturnRefundStatusStep(input)
    return new WorkflowResponse(result)
  }
)

