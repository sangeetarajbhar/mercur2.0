import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaError } from '@medusajs/framework/utils'
import RefundOrderLineItem from '../../../links/refund-order-line-item'
import { buildReturnTrackingTimeline } from '../return-tracking-config'

interface GetReturnTrackingStepInput {
  return_id: string
}

interface GetReturnTrackingStepOutput {
  return_id: string
  track: any
}

export const getReturnTrackingStep = createStep(
  'get-return-tracking',
  async (
    input: GetReturnTrackingStepInput,
    { container }
  ): Promise<StepResponse<GetReturnTrackingStepOutput>> => {
    const { return_id } = input
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: returns } = (await query.graph({
      entity: 'return',
      fields: ['created_at','received_at','canceled_at','refund_amount','items.item_id','status'],
      filters: {
        id: return_id,
      },
    })) as any

    if (!returns?.length) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Return not found')
    }

    const ret = returns[0]
    let ext: Record<string, any> | null = null
    let refundAt: Date | null = null

    if (ret.status !== 'canceled') {
      const { data: extensions } = (await query.graph({
        entity: 'return_extension',
        fields: ['out_for_pickup_at'],
        filters: {
          return_id,
          deleted_at: { $eq: null },
        },
      })) as any

      ext = extensions?.[0] ?? null

      const itemId = ret.items?.[0]?.item_id
      if (itemId) {
        const { data: item } = await query.graph({
          entity: RefundOrderLineItem.entryPoint,
          fields: ['refund.amount', 'refund.created_at'],
          filters: {
            order_line_item_id: itemId,
          },
        })

        const refund = item?.[0]?.refund
        if (refund?.created_at) {
          refundAt = new Date(refund.created_at)
        }
      }
    }

    return new StepResponse({
      return_id,
      track: buildReturnTrackingTimeline({ ret, ext, refundAt }),
    })
  }
)
