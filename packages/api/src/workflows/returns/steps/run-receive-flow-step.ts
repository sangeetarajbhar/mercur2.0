import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import {
  beginReceiveReturnWorkflow,
  receiveItemReturnRequestWorkflow
} from '@medusajs/medusa/core-flows'

import { confirmReceiveReturnWorkflow } from '../workflows/confirm-receive-return'

export interface RunReceiveFlowStepInput {
  return_id: string
  receiveItems: Array<{
    id: string
    quantity: number
  }>
  confirmed_by: string
  filterableFields?: Record<string, unknown>
  queryConfigFields?: string[]
}

export interface RunReceiveFlowStepOutput {
  order_preview: unknown
  return: unknown
}

export const runReceiveFlowStep = createStep(
  'run-receive-flow',
  async (
    input: RunReceiveFlowStepInput,
    { container }
  ): Promise<StepResponse<RunReceiveFlowStepOutput>> => {
    const {
      return_id,
      receiveItems,
      confirmed_by,
      filterableFields,
      queryConfigFields
    } = input
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    logger.info(`[run-receive-flow-step] started, 
      ${JSON.stringify({
        return_id: return_id,
        receive_items_count: receiveItems?.length || 0
      })}
    `)

    // If return is already received, skip receive flow and proceed to refund flow.
    const { data: existingReturns } = await query.graph({
      entity: 'return',
      fields: ['*'],
      filters: { id: return_id }
    })
    const existingReturn = existingReturns?.[0]

    if (existingReturn?.status === 'received') {
      logger.error(`[run-receive-flow-step] skipped receive flow, already received, 
      ${JSON.stringify({
        return_id: return_id,
        status: existingReturn.status
      })}
    `)
      return new StepResponse({
        order_preview: null,
        return: existingReturn
      })
    }
    const { data: existingOrderChanges } = await query.graph({
      entity: 'order_change',
      fields: ['id', 'actions.id', 'actions.action'],
      filters: {
        return_id,
        change_type: 'return_receive'
      }
    })
    const hasReceiveAction = Boolean(
      existingOrderChanges?.some((change: any) =>
        (change.actions || []).some(
          (action: any) => action.action === 'RECEIVE_RETURN_ITEM'
        )
      )
    )
    console.log('hasReceiveAction', hasReceiveAction)

    if (!hasReceiveAction) {
      const { data: pendingReturnReceiveChanges } = await query.graph({
        entity: 'order_change',
        fields: ['id'],
        filters: {
          return_id,
          status: 'pending',
          change_type: 'return_receive'
        }
      })
      console.log('pendingReturnReceiveChanges', pendingReturnReceiveChanges)
      
      const hasPendingReturnReceiveChange = Boolean(
        pendingReturnReceiveChanges?.length
      )

      if (!hasPendingReturnReceiveChange) {
        await beginReceiveReturnWorkflow(container).run({
          input: { return_id }
        })
      }

      await receiveItemReturnRequestWorkflow(container).run({
        input: {
          items: receiveItems,
          return_id
        }
      })
    }

    const { result } = await confirmReceiveReturnWorkflow(container).run({
      input: {
        return_id,
        confirmed_by,
        filterableFields,
        queryConfigFields
      }
    })

    const eventBus = container.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: 'return_items_received',
      data: { return_id }
    })

    logger.info(`[run-receive-flow-step] return item received completed, 
      ${JSON.stringify({
        return_id: return_id
      })}
    `)

    return new StepResponse({
      order_preview: result.order_preview,
      return: result.return
    })
  }
)
