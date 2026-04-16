import {
  createWorkflow,
  WorkflowData,
  WorkflowResponse,
  transform
} from '@medusajs/framework/workflows-sdk'
import { getDeliveryDetailsStep } from '../steps/get-delivery-details'
import { getLocationDetailsStep } from '../steps/get-location-details'

// Define input type
interface GetOrderDetailsWorkflowInput {
  order_id: string
  order_set_id?: string
}

// Define output types
interface OrderDeliveryDetail {
  id: string
  order_set_id: string
  delivery_type: string
  delivery_date: Date | null | string
  start_time: string | null
  end_time: string | null
  slot_id: string | null
  created_at: Date
  updated_at: Date
}

interface OrderLocationDetail {
  id: string
  order_id: string
  location_id: string
  partner_wh_code?: string
  partner_name?: string
  stock_location_id: string
  stock_location_section_id: string
  stock_location_extension_id: string
  location_name?: string
  partner_code?: string
  partner_id?: string
  marketplace_order_id: string
  invoice_id?: string | null
  packed_by?: Date | null
}

interface OrderDetailsResult {
  delivery_detail: OrderDeliveryDetail | null
  location_detail: OrderLocationDetail | null
}

export const getOrderAdditionalDetailsWorkflow = createWorkflow(
  'get-order-details',
  (input: WorkflowData<GetOrderDetailsWorkflowInput>) => {

    const deliveryDetail = getDeliveryDetailsStep({
      order_set_id: (input.order_set_id || '') as string
    })

    const locationData = getLocationDetailsStep({
      order_id: input.order_id
    })

    // Transform the results to handle the response format
    const result = transform(
      { deliveryDetail, locationData },
      ({ deliveryDetail, locationData }): OrderDetailsResult => {
        const { locationDetail, stockLocationDetail } = locationData || {}

        return {
          delivery_detail: deliveryDetail || null,
          location_detail: locationDetail ? {
            ...locationDetail,
            location_name: stockLocationDetail?.name,
            partner_wh_code: stockLocationDetail?.stock_location_section?.partner_wh_code,
            partner_id: stockLocationDetail?.stock_location_extension?.partner_id,
            location_type: stockLocationDetail?.stock_location_extension?.location_type,
          } : null,
        }
      }
    )

    return new WorkflowResponse(result)
  }
)
