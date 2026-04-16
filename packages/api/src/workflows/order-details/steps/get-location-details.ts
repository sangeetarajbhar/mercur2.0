import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { format } from 'date-fns'

export type GetLocationDetailsDTO = {
  order_id: string
}

export const getLocationDetailsStep = createStep(
  'get-location-details',
  async (data: GetLocationDetailsDTO, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: locationDetails } = await query.graph({
      entity: 'order_extra_detail',
      filters: { order_id: data.order_id },
      fields: ['*']
    })

    const locationDetail = locationDetails?.[0]

    if (!locationDetail?.stock_location_id) {
      return new StepResponse({ locationDetail: null, stockLocationDetail: null })
    }

    if (locationDetail && locationDetail.packed_by){
      const date = locationDetail.packed_by instanceof Date 
        ? locationDetail.packed_by 
        : new Date(locationDetail.packed_by)
        
      if (!Number.isNaN(date.getTime())) {
        locationDetail.packed_by = format(date, 'yyyy-MM-dd HH:mm')
      }
    }

    const { data: stockLocationDetail } = await query.graph({
      entity: 'stock_location',
      filters: { id: locationDetail?.stock_location_id },
      fields: [
        'name',
        'stock_location_section.partner_wh_code',
        'stock_location_extension.partner_id',
        'stock_location_extension.location_type',
      ]
    })

    return new StepResponse({
      locationDetail,
      stockLocationDetail: stockLocationDetail?.[0] || null
    })
  },

)
