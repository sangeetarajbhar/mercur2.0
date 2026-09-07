import {  OrderStatus } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { prepareLineItemData, prepareTaxLinesData } from '../utils'
import { LocationType } from '../../../modules/stock-location-extension/types/common'
import { COD_PAYMENT_PROVIDER } from '../../../utils/constants/payments'
import { OrderLineItemStatus } from '../../../utils/constants/order-statuses'

/**
 * Input type for preparing orders for creation
 */
type PrepareOrdersForCreationInput = {
  cartLineItemWithInventoryLocationData: any
  sellerProducts: any[]
  sellerShippingOptions: any[]
  payment_provider_id?: string
}

/**
 * Output type for orders preparation
 */
type PrepareOrdersForCreationOutput = {
  ordersToCreate: any[]
  sellers: string[]
  variants: any[]
}

/**
 * Step to prepare orders for creation by organizing cart items by seller
 */
export const prepareOrdersForCreationStep = createStep(
  'prepare-orders-for-creation',
  async (
    input: PrepareOrdersForCreationInput
  ): Promise<StepResponse<PrepareOrdersForCreationOutput>> => {
    const {
      cartLineItemWithInventoryLocationData,
      sellerProducts,
      sellerShippingOptions,
      payment_provider_id,
    } = input

    const cart = cartLineItemWithInventoryLocationData

    // Determine if COD payment and set appropriate status
    const isCodPayment = payment_provider_id === COD_PAYMENT_PROVIDER
    const orderStatus = isCodPayment ? OrderLineItemStatus.RFR : OrderLineItemStatus.PAYMENT_PENDING
    // Ensure everything is treated as arrays for safety
    const products = Array.isArray(sellerProducts) ? sellerProducts : []
    const shippingOptions = Array.isArray(sellerShippingOptions)
      ? sellerShippingOptions
      : []
    const items = Array.isArray(cart.items) ? cart.items : []

    // change to use default seller shipping methods if no shipping methods are found
    const shippingMethods = Array.isArray(cart?.shipping_methods) && cart.shipping_methods.length > 0
    ? cart.shipping_methods
    : sellerShippingOptions ?? []

    // Create product seller mapping as plain object
    const productSellerMapping = {}
    for (const sp of products) {
      if (sp.product_id && sp.seller_id) {
        productSellerMapping[sp.product_id] = sp.seller_id
      }
    }

    // Create shipping option seller mapping as plain object
    const shippingOptionSellerMapping = {}
    for (const sp of shippingOptions) {
      if (sp.shipping_option_id && sp.seller_id) {
        shippingOptionSellerMapping[sp.shipping_option_id] = sp.seller_id
      }
    }
    // Initialize data structures for organizing split items by location and seller
    const orderGroupsMap = new Map<string, any[]>() // Key: orderKey, Value: split items
    const sellerShippingMethodsMap = new Map<string, any>()
    const variantsMap = new Map<string, any>()
    const allSellers = new Set<string>()

    // VALIDATION: Ensure all items have location allocations
    const itemsWithoutAllocations = items.filter(item => !item.metadata?.allocatedLocations?.length)
    if (itemsWithoutAllocations.length > 0) {
      const itemIds = itemsWithoutAllocations.map(item => item.id).join(', ')
      throw new Error(`Missing location allocations for items: ${itemIds}. This indicates a data flow issue in the workflow.`)
    }

    // SPLIT ITEMS LOGIC: Create split items based on location allocations
    for (const item of items) {
      // This check is now redundant but kept for safety
      if (!item.metadata?.allocatedLocations?.length) {
        throw new Error(`Critical workflow error: Item ${item.id} missing location allocations`)
      }

      const sellerId = item.seller.id
      allSellers.add(sellerId)
      const originalQuantity = item.quantity // Store original quantity for promotion calculations

      // Calculate proportional adjustment amounts for splitting
      const proportionalAdjustments = (item.adjustments ?? []).map(adj => ({
        ...adj,
        amount: adj.amount / originalQuantity, // Split amount proportionally
        original_amount: adj.amount, // Keep track of original amount
        original_quantity: originalQuantity
      }))

      // Create split items based on allocated locations
      for (const allocation of item.metadata.allocatedLocations) {
        // Create individual split items (quantity = 1 each)
        for (let i = 0; i < allocation.allocatedQuantity; i++) {
          const splitItem = {
            ...item,
            quantity: 1, // Each split item has quantity 1
            location_id: allocation.location_id,
            location_type: allocation.location_type,
            seller_id: sellerId,
            split_index: i,
            original_item_id: item.id,
            adjustments: proportionalAdjustments // Use proportionally split adjustments
          }

          // GROUP SPLIT ITEMS BY LOCATION TYPE RULES
          let orderKey: string

          if (allocation.location_type === LocationType.OMNI.toString()) {
            // OMNI Store: Each split item creates a separate order
            orderKey = `${sellerId}|${allocation.location_id}|${item.id}|${i}`
          } else if (allocation.location_type === LocationType.DARK_STORE.toString()) {
            // DARK Store: Group all split items by seller+location
            orderKey = `${sellerId}|${allocation.location_id}`
          } else {
            // This else is not expected to be reached, if it is, then there is a bug in the workflow
            console.error(`Unknown location type: ${allocation.location_type} for location ${allocation.location_id}`)
            continue
          }

          // Add split item to the appropriate order group
          const existingItems = orderGroupsMap.get(orderKey) || []
          orderGroupsMap.set(orderKey, [...existingItems, splitItem])
        }
      }

      // Store variant for later use
      if (item.variant.id) {
        variantsMap.set(item.variant.id, item.variant)
      }
    }

    const sellers = Array.from(allSellers)

    // Assign shipping methods to sellers
    for (const method of shippingMethods) {
      const sellerId = shippingOptionSellerMapping[method.shipping_option_id]
      if (sellerId) {
        sellerShippingMethodsMap.set(sellerId, method)
      } else {
        // Assign to all sellers who don't have a shipping method yet
        for (const sid of sellers) {
          if (!sellerShippingMethodsMap.has(sid)) {
            sellerShippingMethodsMap.set(sid, method)
          }
        }
      }
    }
    // If sellers still don't have shipping methods, use the first available
    if (shippingMethods.length > 0 && sellerShippingMethodsMap.size < sellers.length) {
      const defaultMethod = shippingMethods[0]
      for (const sid of sellers) {
        if (!sellerShippingMethodsMap.has(sid)) {
          sellerShippingMethodsMap.set(sid, defaultMethod)
        }
      }
    }

    // Create orders for each order group (based on split items)
    const ordersToCreate = Array.from(orderGroupsMap.entries()).map(([orderKey, splitItems]) => {
      const [sellerId, locationId] = orderKey.split('|')
      const locationType = splitItems[0]?.location_type
      const sm = sellerShippingMethodsMap.get(sellerId)

      // Shipping method should always get, if not then there is a bug in the workflow
      if (!sm) {
        // Force assign the first method if still no shipping method
        if (shippingMethods.length > 0) {
          const forcedMethod = shippingMethods[0]
          sellerShippingMethodsMap.set(sellerId, forcedMethod)

          return {
            region_id: cart.region?.id,
            customer_id: cart.customer?.id,
            sales_channel_id: cart.sales_channel_id,
            status: orderStatus,
            email: cart.email,
            currency_code: cart.currency_code,
            shipping_address: cart.shipping_address,
            billing_address: cart.billing_address,
            no_notification: false,
            items: splitItems.map((splitItem) =>
              prepareLineItemData({
                item: splitItem,
                variant: splitItem.variant,
                unitPrice: splitItem.unit_price,
                compareAtUnitPrice: splitItem.compare_at_unit_price,
                isTaxInclusive: splitItem.is_tax_inclusive,
                quantity: splitItem.quantity, // Always 1 for split items
                metadata: splitItem?.metadata,
                taxLines: splitItem.tax_lines ?? [],
                adjustments: splitItem.adjustments ?? [], // Now properly proportioned
                seller_id: sellerId,
                location_id: splitItem.location_id // Add location_id to line item
              })
            ),
            promo_codes: [
              ...new Set( // Remove duplicates
                splitItems
                  .map((item) => item.adjustments ?? [])
                  .flat(1)
                  .map((adjustment) => adjustment.code)
                  .filter(Boolean)
              )
            ],
            shipping_methods: [
              {
                name: forcedMethod.name,
                description: forcedMethod.description,
                amount: forcedMethod.amount,
                is_tax_inclusive: forcedMethod.is_tax_inclusive,
                shipping_option_id: forcedMethod.shipping_option_id,
                data: forcedMethod.data,
                metadata: forcedMethod.metadata,
                tax_lines: prepareTaxLinesData(forcedMethod.tax_lines ?? [])
              }
            ]
          }
        }
        // throw new MedusaError(
        //   MedusaError.Types.INVALID_DATA,
        //   `Seller shipping method not found for seller xxx ${sellerId}! Available methods: ${shippingMethods.length}`
        // )
      }

      // Prepare line items for this order group (split items)
      const orderItems = splitItems.map((splitItem) =>
        prepareLineItemData({
          item: splitItem,
          variant: splitItem.variant,
          unitPrice: splitItem.unit_price,
          compareAtUnitPrice: splitItem.compare_at_unit_price,
          isTaxInclusive: splitItem.is_tax_inclusive,
          quantity: splitItem.quantity, // Always 1 for split items
          metadata: splitItem?.metadata,
          taxLines: splitItem.tax_lines ?? [],
          adjustments: splitItem.adjustments ?? [], // Now properly proportioned
          seller_id: sellerId,
          location_id: splitItem.location_id // Add location_id to line item
        })
      )

      return {
        region_id: cart.region?.id,
        customer_id: cart.customer?.id,
        sales_channel_id: cart.sales_channel_id,
        status: orderStatus,
        email: cart.email,
        currency_code: cart.currency_code,
        shipping_address: cart.shipping_address,
        billing_address: cart.billing_address,
        no_notification: false,
        items: orderItems,
        promo_codes: [
          ...new Set( // Remove duplicates
            splitItems
              .map((item) => item.adjustments ?? [])
              .flat(1)
              .map((adjustment) => adjustment.code)
              .filter(Boolean)
          )
        ],
        metadata: {
          order_location_id: locationId,
          order_location_type: locationType,
          seller_id: sellerId,
          created_from_cart: cart.id,
        },
        shipping_methods: [
          {
            name: sm?.name ?? sm?.shipping_option?.name ?? 'Standard Shipping',
            description: sm?.description ?? '',
            amount: sm?.amount ?? 0,
            is_tax_inclusive: sm?.is_tax_inclusive ?? false,
            shipping_option_id: sm?.shipping_option_id,
            data: sm?.data ?? sm?.shipping_option?.data,
            metadata: sm?.metadata ?? sm?.shipping_option?.metadata,
            tax_lines: prepareTaxLinesData(sm?.tax_lines ?? [])
          }
        ]
      }
    })

    return new StepResponse({
      ordersToCreate,
      sellers,
      variants: Array.from(variantsMap.values())
    })
  }
)
