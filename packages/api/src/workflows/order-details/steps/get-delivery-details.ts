import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { format } from 'date-fns'


export type GetDeliveryDetailsDTO = {
  order_set_id: string
}

export const getDeliveryDetailsStep = createStep(
  'get-delivery-details',
  async (data: GetDeliveryDetailsDTO, { container }) => {

    if (!data.order_set_id) {
      return new StepResponse(null, null)
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: deliveryDetail } = await query.graph({
      entity: 'order_delivery_detail',
      filters: { order_set_id: data.order_set_id },
      fields: ['*']
    })

    const result = deliveryDetail?.[0] || null

    // Format delivery_date to preserve IST date using date-fns
    // date-fns format() uses server's local timezone (IST) automatically
    // This ensures the date part matches what's stored in the database
    if (result && result.delivery_date) {
      const date = result.delivery_date instanceof Date   
        ? result.delivery_date 
        : new Date(result.delivery_date)
      
      if (!Number.isNaN(date.getTime())) {
        // Format as YYYY-MM-DD using server's local timezone (IST)
        result.delivery_date = format(date, 'yyyy-MM-dd')
        // result.delivery_date = result.delivery_date.toISOString().split('T')[0]
      }
    }

    return new StepResponse(result)
  },

)