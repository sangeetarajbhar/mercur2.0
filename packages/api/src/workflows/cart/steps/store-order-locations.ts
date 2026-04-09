import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { randomUUID } from 'crypto'
import { ORDER_EXTRA_DETAIL_MODULE } from '../../../modules/order-extra-detail'
import OrderExtraDetailModuleService from '../../../modules/order-extra-detail/service'
import { MedusaError } from '@medusajs/framework/utils'

/**
 * Input type for storing order locations
 */
type StoreOrderLocationsInput = {
  orders: { id: string; items?: any[]; metadata?: any }[]
}

/**
 * Step to store order-location associations in the database
 * This helps track which locations each order is associated with
 */
type OrderExtraDetailResult = {
  id: string
  order_id: string
  marketplace_order_id: string
}

export const storeOrderLocationsStep = createStep(
  'store-order-locations',
  async (
    input: StoreOrderLocationsInput,
    { container }
  ): Promise<StepResponse<OrderExtraDetailResult[], string[]>> => {
    const { orders } = input

    const orderLocationMappings: any[] = []

    for (const order of orders) {
      if (order?.metadata?.order_location_id) {
        orderLocationMappings.push({
          order_id: order.id,
          stock_location_id: order.metadata.order_location_id,
          marketplace_order_id: randomUUID(),
          packed_by: new Date() // Set current timestamp when order is created
        })
      }
    }

    if (!orderLocationMappings.length) {
      console.log('No order-location mappings to store', orders)
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `No order location mappings to store`)
      // return new StepResponse(input, [])
    }

    try {
      const orderExtraDetailService = container.resolve(ORDER_EXTRA_DETAIL_MODULE) as OrderExtraDetailModuleService

      // Insert data in bulk
      const createdMappings = await orderExtraDetailService.createOrderExtraDetails(orderLocationMappings)

      // Return full mappings including marketplace_order_id (for output)
      // and just IDs for compensation
      const createdIds = createdMappings.map(mapping => mapping.id)
      const outputData = createdMappings.map(mapping => ({
        id: mapping.id,
        order_id: mapping.order_id,
        marketplace_order_id: mapping.marketplace_order_id
      }))

      return new StepResponse(outputData, createdIds)
    } catch (error) {
      console.error('Error storing order locations:', error)
      console.error('Error storing order locations data orderLocationMappings: ', orderLocationMappings)
      throw error
    }
  },
  async (createdIds: string[], { container }) => {
    if (!createdIds || createdIds.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Order extra detail IDs are required for compensation'
      )
    }

    try {
      const orderExtraDetailService = container.resolve(ORDER_EXTRA_DETAIL_MODULE) as OrderExtraDetailModuleService

      //Delete the created order-location mappings
      await orderExtraDetailService.softDeleteOrderExtraDetails(createdIds)
    } catch (error) {
      console.error('Error during rollback of order locations:', error)
    }
  }
)
