import { deduplicate } from '@medusajs/framework/utils'
import {
  WorkflowResponse,
  createWorkflow,
  transform
} from '@medusajs/framework/workflows-sdk'
import { useQueryGraphStep } from '@medusajs/medusa/core-flows'

import { formatOrderSets } from '../utils'
import { enhanceOrderSetsWithExtraChargesStep } from '../steps/enhance-order-sets-with-extra-charges'
import { enhanceOrderItemsWithReturnsStep } from '../steps/enhance-order-items-with-returns'
import { storeWorkflow } from "../../../shared/utils/constants";

export const getFormattedOrderSetListWorkflow = createWorkflow({
  name: 'get-formatted-order-set-list',
  store: true
},
  function (input: {
    fields?: string[]
    filters?: Record<string, any>
    pagination?: {
      skip: number
      take?: number
      order?: Record<string, any>
    }
  }) {
    const fields = transform(input, ({ fields }) => {
      const inputFields = fields ?? []
      // Fields to exclude if they're not in input (to prevent fetching heavy/unnecessary data)
      const excludeFields = ['orders.customer.*', 'orders.items.variant.*', 'cart.*']

      // Check which fields should be excluded (only if they're not explicitly requested)
      const fieldsToExclude = excludeFields.filter(excludeField => !inputFields.includes(excludeField))

      const allFields = deduplicate([
        ...inputFields,
        'id',
        'ui_order_set_id',
        'updated_at',
        'created_at',
        'display_id',
        'status',
        // 'accepted_at',
        // 'rejected_at',
        // 'cancelled_at',
        // 'packed_at',
        // 'shipped_at',
        // 'delivered_at',
        'rider_assigned_at',
        'metadata',
        'customer_id',
        'customer.*',
        'cart_id',
        // 'cart.*', // Excluded by default, but can be explicitly requested
        'cart.shipping_address.*', // Explicitly fetch shipping address details from cart
        'payment_collection_id',
        'payment_collection.*', // Always include payment_collection
        // OLD: 'payment_collection.*' - This was fetching ALL fields including raw_*
        // Now relying on explicit fields passed from query-config.ts
        'orders.id',
        'orders.currency_code',
        'orders.email',
        'orders.created_at',
        'orders.updated_at',
        'orders.completed_at',
        'orders.status',
        'orders.payment_status',
        'orders.fulfillment_status',
        'orders.total',
        'orders.subtotal',
        'orders.tax_total',
        'orders.discount_total',
        'orders.discount_tax_total',
        'orders.original_total',
        'orders.original_subtotal',
        'orders.original_tax_total',
        'orders.item_total',
        'orders.item_subtotal',
        'orders.item_tax_total',
        'orders.sales_channel_id',
        'orders.original_item_total',
        'orders.original_item_subtotal',
        'orders.original_item_tax_total',
        'orders.shipping_total',
        'orders.shipping_subtotal',
        'orders.shipping_tax_total',
        // OLD: 'orders.items.*' - This was fetching ALL fields including raw_*
        'orders.items.*',
        // Now relying on explicit fields passed from query-config.ts
        // 'orders.items.order_line_item_extension.status',
        // 'orders.items.returns.*', Unable to fetch returns for items
        // 'orders.items.returns.reason.*',
        // 'orders.customer.*', // Excluded by default, but can be explicitly requested
        'orders.fulfillments.*',
        // 'orders.summary'
      ])

      // Remove excluded fields from the final list
      return allFields.filter(field => !fieldsToExclude.includes(field))
    })


    const { data, metadata } = useQueryGraphStep({
      entity: 'order_set',
      fields,
      filters: input.filters,
      pagination: input.pagination
    })

    console.log('data order_set: ')
    console.dir(data, { depth: null, colors: true })

    // Enhance order sets with extra charges
      const enhancedOrderSets = enhanceOrderSetsWithExtraChargesStep(data)

      // Add variant original prices to items
      // const orderSetsWithPricing = addVariantOriginalPricesStep(enhancedOrderSets)

      // Enhance order items with returns data
      // Had to use another strategy as fetching returns directly from the query for giving error
      const orderSetsWithReturns = enhanceOrderItemsWithReturnsStep(enhancedOrderSets)

    const formattedOrderSets = transform(orderSetsWithReturns, formatOrderSets)
    // const formattedOrderSets = transform(enhancedOrderSets, formatOrderSets)

    return new WorkflowResponse({ data: formattedOrderSets, metadata })
  }
)

// for admin call below function, and for rest original function getFormattedOrderSetListWorkflow undo the changes for return object use-case
// will remove getFormattedOrderSetListWorkflowAdmin once it is tested
export const getFormattedOrderSetListWorkflowAdmin = createWorkflow(
  'get-formatted-order-set-list-admin',
  function (input: {
    fields?: string[]
    filters?: Record<string, any>
    pagination?: {
      skip: number
      take?: number
      order?: Record<string, any>
    }
  }) {
    const fields = transform(input, ({ fields }) => {
      const inputFields = fields ?? []
      // Fields to exclude if they're not in input (to prevent fetching heavy/unnecessary data)
      const excludeFields = ['orders.customer.*', 'orders.items.variant.*', 'cart.*']

      // Check which fields should be excluded (only if they're not explicitly requested)
      const fieldsToExclude = excludeFields.filter(excludeField => !inputFields.includes(excludeField))

      const allFields = deduplicate([
        ...inputFields,
        'id',
        'ui_order_set_id',
        'updated_at',
        'created_at',
        'display_id',
        'status',
        // 'accepted_at',
        // 'rejected_at',
        // 'cancelled_at',
        // 'packed_at',
        // 'shipped_at',
        // 'delivered_at',
        'rider_assigned_at',
        'metadata',
        'customer_id',
        'customer.*',
        'cart_id',
        // 'cart.*', // Excluded by default, but can be explicitly requested
        'cart.shipping_address.*', // Explicitly fetch shipping address details from cart
        'payment_collection_id',
        'payment_collection.*', // Always include payment_collection
        // OLD: 'payment_collection.*' - This was fetching ALL fields including raw_*
        // Now relying on explicit fields passed from query-config.ts
        'orders.id',
        'orders.currency_code',
        'orders.email',
        'orders.created_at',
        'orders.updated_at',
        'orders.completed_at',
        'orders.status',
        'orders.payment_status',
        'orders.fulfillment_status',
        'orders.total',
        'orders.subtotal',
        'orders.tax_total',
        'orders.discount_total',
        'orders.discount_tax_total',
        'orders.original_total',
        'orders.original_subtotal',
        'orders.original_tax_total',
        'orders.item_total',
        'orders.item_subtotal',
        'orders.item_tax_total',
        'orders.sales_channel_id',
        'orders.original_item_total',
        'orders.original_item_subtotal',
        'orders.original_item_tax_total',
        'orders.shipping_total',
        'orders.shipping_subtotal',
        'orders.shipping_tax_total',
        // OLD: 'orders.items.*' - This was fetching ALL fields including raw_*
        'orders.items.*',
        // Now relying on explicit fields passed from query-config.ts
        // 'orders.items.order_line_item_extension.status',
        // 'orders.items.returns.*', Unable to fetch returns for items
        // 'orders.items.returns.reason.*',
        // 'orders.customer.*', // Excluded by default, but can be explicitly requested
        'orders.fulfillments.*',
        // 'orders.summary'
      ])

      // Remove excluded fields from the final list
      return allFields.filter(field => !fieldsToExclude.includes(field))
    })


    const { data, metadata } = useQueryGraphStep({
      entity: 'order_set',
      fields,
      filters: input.filters,
      pagination: input.pagination
    })

    // Enhance order sets with extra charges
    const enhancedOrderSets = enhanceOrderSetsWithExtraChargesStep(data)

    // Add variant original prices to items
    // const orderSetsWithPricing = addVariantOriginalPricesStep(enhancedOrderSets)

    // Enhance order items with returns data
    // Had to use another strategy as fetching returns directly from the query for giving error
    // const orderSetsWithReturns = enhanceOrderItemsWithReturnsStep(enhancedOrderSets)

    // const formattedOrderSets = transform(orderSetsWithReturns, formatOrderSets)
    const formattedOrderSets = transform(enhancedOrderSets, formatOrderSets)

    return new WorkflowResponse({ data: formattedOrderSets, metadata })
  }
)
