import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { useRemoteQueryStep } from '@medusajs/medusa/core-flows'
import { completeCartFields } from '../utils'

/**
 * Input type for querying cart details
 */
type QueryCartInput = {
  id: string
}

/**
 * Output type for cart details
 */
type QueryCartOutput = {
  cart: any
}

/**
 * Step to query cart details
 */
export const queryCartStep = createStep(
  'query-cart',
  async (input: QueryCartInput): Promise<StepResponse<QueryCartOutput>> => {
    const { id } = input

    const cart = useRemoteQueryStep({
      entry_point: 'cart',
      fields: completeCartFields,
      variables: {
        id
      },
      list: false
    }).config({ name: 'cart-query' })

    return new StepResponse({ cart })
  }
)
