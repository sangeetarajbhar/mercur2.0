import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import { ORDER_LINE_ITEM_EXTENSION_MODULE } from '../../../modules/order-line-item-extension'
import OrderLineItemExtensionModuleService from '../../../modules/order-line-item-extension/service'
import { getOrderDetailWorkflow } from '@medusajs/medusa/core-flows'
import { roundToTwoDecimals} from '../../../shared/utils/calculate-discount-amount'
import { COD_PAYMENT_PROVIDER } from '../../../utils/constants/payments'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

type StoreOrderLineItemInput = {
  orders: { id: string; items?: any[] }[]
  order_set_id: string
  payment_provider_id?: string
  payment_collection_id?: string
}

type ProductConfigurationData = {
  id: string;
  product_id: string;
  product_configuration_id: string
  product_configuration: {
    id: string
    returnable_days: string;
    is_returnable: boolean;
    is_exchangeable: boolean;
    is_try_and_buy: boolean;
  };
}
export const storeOrderLineItemExtensionData = createStep(
  'store-order-line-item-extension-data',
  async (
    input: StoreOrderLineItemInput,
    { container }
  ): Promise<StepResponse<StoreOrderLineItemInput, { id: string; order_line_item_id: string }[]>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { orders, order_set_id, payment_provider_id, payment_collection_id } = input

    // Check if order is home_trial - returnable_flag should always be false for home_trial
    let isHomeTrial = false
    const { data: [orderDeliveryDetail] } = await query.graph({
      entity: 'order_delivery_detail',
      fields: ['delivery_type'],
      filters: { order_set_id }
    })
    isHomeTrial = orderDeliveryDetail?.delivery_type === 'home_trial'

    // Determine if COD payment
    let isCodPayment = false
    if (payment_provider_id) {
      isCodPayment = payment_provider_id === COD_PAYMENT_PROVIDER
    } else if (payment_collection_id) {
      // Fallback: query payment session if provider_id not provided
      const { data: paymentSessions } = await query.graph({
        entity: 'payment_session',
        fields: ['provider_id'],
        filters: {
          payment_collection_id: payment_collection_id
        }
      })
      isCodPayment = paymentSessions?.[0]?.provider_id === COD_PAYMENT_PROVIDER
    }

    // Set status: COD -> 'RFR', Prepaid -> 'PAYMENT_PENDING'
    const status = isCodPayment ? OrderLineItemStatus.RFR : OrderLineItemStatus.PAYMENT_PENDING

    const orderLineItemExtensionMappings: any[] = []

    //Collect all product IDs first to batch query
    const allProductIds = new Set<string>()
    for (const order of orders) {
      const lineItems = order.items as any[]
      for (const lineItem of lineItems) {
        if (lineItem.product_id) {
          allProductIds.add(lineItem.product_id)
        }
      }
    }

    // Batch query all product configurations at once
    const productConfigurationsMap = new Map<string, ProductConfigurationData>()
    if (allProductIds.size > 0) {
      const { data } = await query.graph({
        entity: 'product_product_configuration',
        fields: [
          'id',
          'product_id',
          'product_configuration.returnable_days',
          'product_configuration.is_returnable',
          'product_configuration.is_exchangeable',
          'product_configuration.is_try_and_buy',
        ],
        filters: {
          product_id: Array.from(allProductIds),
        },
      })

      // Create a map for quick lookup
      for (const config of data as unknown as (ProductConfigurationData & { product_id: string })[]) {
        productConfigurationsMap.set(config.product_id, config)
      }
    }

    for (const order of orders) {
      const lineItems = order.items as any[]
      const { result: orderData } = await getOrderDetailWorkflow.run({
        container,
        input: {
          order_id: order.id,
          fields: [
            'id',
            'items.*',
            'total',
            'subtotal',
            'tax_total',
            'discount_total',
            'shipping_total',
            'original_total',
            'original_subtotal',
            'original_tax_total',
          ]
        }
      })

      for (const lineItem of lineItems) {
        // Use the batched data instead of individual queries
        const productConfigurationData = productConfigurationsMap.get(lineItem.product_id)

        const item_total = orderData.items?.find(item => item.id === lineItem.id)?.total || 0
        const item_discount_total = orderData.items?.find(item => item.id === lineItem.id)?.discount_total || 0
        if (productConfigurationData?.product_configuration) {
          const productConfig = productConfigurationData.product_configuration;
            orderLineItemExtensionMappings.push({
              order_line_item_id: lineItem.id,
              returnable_flag: isHomeTrial ? false : productConfig.is_returnable,
              return_no_of_days: isHomeTrial ? 0 : productConfig.returnable_days,
              item_total: roundToTwoDecimals(Number(item_total)),
              item_discount_total: roundToTwoDecimals(Number(item_discount_total)),
              status: status
            })
        } else {
          orderLineItemExtensionMappings.push({
            order_line_item_id: lineItem.id,
            returnable_flag: false,
            return_no_of_days: 0,
            item_total: roundToTwoDecimals(Number(item_total)),
            item_discount_total: roundToTwoDecimals(Number(item_discount_total)),
            status: status
          })
        }
      }
    }

    if (!orderLineItemExtensionMappings.length) {
      console.log('No returnable data to store', orders)
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `No returnable data to store`)
      // Return empty array with correct type instead of throwing error
      // return new StepResponse(input, [])
    }

    try {
      const orderLineItemExtensionService = container.resolve(ORDER_LINE_ITEM_EXTENSION_MODULE) as OrderLineItemExtensionModuleService

      // Insert data in bulk
      const orderLineItemExtensions = await orderLineItemExtensionService.createOrderLineItemExtensions(orderLineItemExtensionMappings)

      if (orderLineItemExtensions.length > 0) {
        const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)

        for(const orderLineItemExtension of orderLineItemExtensions) {
          await remoteLink.create({
            [Modules.ORDER]: {
              order_line_item_id: orderLineItemExtension.order_line_item_id
            },
            [ORDER_LINE_ITEM_EXTENSION_MODULE]: {
              order_line_item_extension_id: orderLineItemExtension.id
            }
          })
        }
      }

      // Return created extensions with line item IDs for proper compensation
      const compensationData = orderLineItemExtensions.map(extension => ({
        id: extension.id,
        order_line_item_id: extension.order_line_item_id
      }))

      return new StepResponse(input, compensationData)
    } catch (error) {
      console.error('Error storing order returnable days data error:', error)
      console.error('Error storing order returnable days data orderLineItemExtensionMappings: ', orderLineItemExtensionMappings)
      throw error
    }
  },
  async (compensationData: { id: string; order_line_item_id: string }[], { container }) => {
    if (!compensationData || compensationData.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Order line item extension IDs are required for compensation'
      )
    }

    try {
      const orderLineItemExtensionService = container.resolve(ORDER_LINE_ITEM_EXTENSION_MODULE) as OrderLineItemExtensionModuleService
      const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)

      // Delete the remote links first using correct IDs
      for (const data of compensationData) {
        try {
          await remoteLink.dismiss({
            [Modules.ORDER]: {
              order_line_item_id: data.order_line_item_id
            },
            [ORDER_LINE_ITEM_EXTENSION_MODULE]: {
              order_line_item_extension_id: data.id
            }
          })
        } catch (dismissError) {
          console.error(`Failed to dismiss link for order line item extension ${data.id}:`, dismissError)
        }
      }

      // Delete the extension records
      const extensionIds = compensationData.map(data => data.id)
      await orderLineItemExtensionService.softDeleteOrderLineItemExtensions(extensionIds)
    } catch (error) {
      console.error('Error during rollback of order returnable days data:', error)
    }
  }
)
