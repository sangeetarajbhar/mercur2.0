import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys, generateEntityId } from '@medusajs/framework/utils'
import { Readable, PassThrough } from 'stream'
import { batchUploadToS3Stream } from '../../../shared/utils/common'
import productBrandLink from '../../../links/product-brand'

interface ReturnsExportData {
  returnRequests: any[]
  refundMethodByReturnId: Record<string, any>
}

interface CSVRow {
  [key: string]: string | number | boolean | null
}

const CSV_HEADERS = [
  'return_id',
  'Serial number',
  'customer_name',
  'customer_address',
  'customer_email',
  'customer_phone',
  'requested_at',
  'order_id',
  'order_number',
  'order_created_at',
  'received_at',
  'payment_gateway_name',
  'payment_gateway_transaction_id',
  'payment_transaction_date',
  'order_payment_gateway',
  'item_name',
  'item_quantity',
  'item_price',
  'sku',
  'reason',
  'warehouse_location',
  'refund_status',
  'requested_refund_mode',
  'actual_refund_mode',
  'refund_additional_details',
  'refunded_at',
  'eligible_refund_amount',
  'refunded_amount',
  'bank_detail_id',
  'upi_detail_id',
  'account_number',
  'ifsc_code',
  'upi_id',
  'account_holder_name',
  'original_return_method',
  'actual_return_method',
  'images',
  'marketplace_order_id',
  'ui_order_set_id',
  'brand'
]

export const generateReturnsCsvStep = createStep(
  'generate-returns-csv',
  async (data: ReturnsExportData, { container }) => {
    const { returnRequests, refundMethodByReturnId } = data
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Collect all reason_ids from all return items
    const reasonIds = new Set<string>()
    for (const returnRequest of returnRequests) {
      if (returnRequest?.items) {
        for (const returnItem of returnRequest.items) {
          if (returnItem.reason_id) {
            reasonIds.add(returnItem.reason_id)
          }
        }
      }
    }

    // Fetch all return reasons in one batch query
    const reasonIdMap = new Map<string, string>()
    if (reasonIds.size > 0) {
      const { data: returnReasons } = await query.graph({
        entity: 'return_reason',
        fields: ['id', 'label'],
        filters: {
          id: Array.from(reasonIds)
        }
      })

      // Create a map of reason_id -> label
      for (const reason of returnReasons) {
        if (reason?.id && reason?.label) {
          reasonIdMap.set(reason.id, reason.label)
        }
      }
    }

    // Collect all unique stock_location_ids from all return requests (from order)
    const stockLocationIds = new Set<string>()
    for (const returnRequest of returnRequests) {
      const order = (returnRequest as any)?.order
      if (order?.stock_location_id) {
        stockLocationIds.add(order.stock_location_id)
      }
    }

    // Fetch all stock locations with their return_location_id in one batch query
    const stockLocationToReturnLocationMap = new Map<string, string>()
    const warehouseLocationMap = new Map<string, string>()
    
    if (stockLocationIds.size > 0) {
      const { data: stockLocations } = await query.graph({
        entity: "stock_location",
        fields: [
          "id",
          "stock_location_extension.return_location_id",
        ],
        filters: {
          id: Array.from(stockLocationIds)
        }
      })

      // Create a map of stock_location_id -> return_location_id
      const returnLocationIds = new Set<string>()
      for (const stockLocation of stockLocations) {
        if (stockLocation?.id && stockLocation?.stock_location_extension?.return_location_id) {
          stockLocationToReturnLocationMap.set(
            stockLocation.id,
            stockLocation.stock_location_extension.return_location_id
          )
          returnLocationIds.add(stockLocation.stock_location_extension.return_location_id)
        }
      }

      // Fetch all return locations (stock locations) with their names in one batch query
      if (returnLocationIds.size > 0) {
        const { data: returnLocations } = await query.graph({
          entity: "stock_location",
          fields: ["id", "name"],
          filters: {
            id: Array.from(returnLocationIds)
          }
        })

        // Create a map of return_location_id -> name
        const returnLocationNameMap = new Map<string, string>()
        for (const returnLocation of returnLocations) {
          if (returnLocation?.id && returnLocation?.name) {
            returnLocationNameMap.set(returnLocation.id, returnLocation.name)
          }
        }

        // Create final map: stock_location_id -> warehouse_location_name
        for (const [stockLocationId, returnLocationId] of stockLocationToReturnLocationMap.entries()) {
          const warehouseName = returnLocationNameMap.get(returnLocationId)
          if (warehouseName) {
            warehouseLocationMap.set(stockLocationId, warehouseName)
          }
        }
      }
    }

    // Collect all item_ids from all return items across all return requests
    const itemIds = new Set<string>()
    for (const returnRequest of returnRequests) {
      if (returnRequest?.items) {
        for (const returnItem of returnRequest.items) {
          if (returnItem.item_id) {
            itemIds.add(returnItem.item_id)
          }
        }
      }
    }

    // Fetch all order_line_items to get product_ids in one batch query
    const itemIdToProductIdMap = new Map<string, string>()
    const productIds = new Set<string>()
    
    if (itemIds.size > 0) {
      const { data: orderLineItems } = await query.graph({
        entity: "order_line_item",
        fields: ["id", "product_id"],
        filters: {
          id: Array.from(itemIds)
        }
      })

      // Create a map of item_id -> product_id
      for (const orderLineItem of orderLineItems) {
        if (orderLineItem?.id && orderLineItem?.product_id) {
          itemIdToProductIdMap.set(orderLineItem.id, orderLineItem.product_id)
          productIds.add(orderLineItem.product_id)
        }
      }
    }

    // Fetch all product_brand links to get brand names in one batch query
    const productIdToBrandNameMap = new Map<string, string>()
    
    if (productIds.size > 0) {
      const { data: productBrands } = await query.graph({
        entity: productBrandLink.entryPoint,
        fields: ["product_id", "brand.name"],
        filters: {
          product_id: Array.from(productIds)
        }
      })

      // Create a map of product_id -> brand_name
      for (const productBrand of productBrands) {
        if (productBrand?.product_id && productBrand?.brand?.name) {
          productIdToBrandNameMap.set(productBrand.product_id, productBrand.brand.name)
        }
      }
    }

    // Create final map: item_id -> brand_name
    const itemIdToBrandNameMap = new Map<string, string>()
    for (const [itemId, productId] of itemIdToProductIdMap.entries()) {
      const brandName = productIdToBrandNameMap.get(productId)
      if (brandName) {
        itemIdToBrandNameMap.set(itemId, brandName)
      }
    }

    // Memory optimization: Process in batches
    const BATCH_SIZE = 100

    // Create a generator function that yields CSV rows
    async function* generateCSVRows() {
      // Yield header row
      yield CSV_HEADERS.map(escapeCSVField).join(',') + '\n'

      let serialNumber = 1
      let rowsGenerated = 0

      // Process returns in batches
      for (let i = 0; i < returnRequests.length; i += BATCH_SIZE) {
        const batch = returnRequests.slice(i, i + BATCH_SIZE)

        for (const returnRequest of batch) {
          if (!returnRequest) {
            continue
          }
          
          // Type assertion for return request
          const rr = returnRequest as any
          
          // Get refund method for this return
          const refundMethod = refundMethodByReturnId[rr.id]

          // Get order details
          const order = rr.order || {}
          const customer = order.customer || {}
          const marketplaceOrderId = order.marketplace_order_id || ''
          
          // Try to get shipping address from order first, then from customer addresses
          // Priority: 1. order.shipping_address, 2. order.customer.addresses[0], 3. empty object
          let shippingAddress = order.shipping_address || null
          
          // If no shipping address on order, try customer addresses
          if (!shippingAddress && order.customer?.addresses && order.customer.addresses.length > 0) {
            shippingAddress = order.customer.addresses[0]
          }
          
          // Fallback to empty object if still no address
          if (!shippingAddress) {
            shippingAddress = {}
          }
          
          const payments = order.payment_collections?.[0]?.payments || []
          const payment = payments[0] || {}
          
          // Get payment gateway info
          const paymentGatewayName = payment.provider_id || ''
          const paymentTransactionId = payment.data?.transaction_id || payment.data?.id || ''
          const paymentTransactionDate = payment.created_at ? new Date(payment.created_at).toISOString() : ''
          const orderPaymentGateway = paymentGatewayName

          // Get refund info
          const refunds = payments.flatMap((p: any) => p?.refunds || []).filter(Boolean)
          const refund = refunds[0] || {}
          const refundStatus = rr.status || ''
          const refundedAmount = rr.refund_amount || refunds.reduce((sum: number, r: any) => {
            const amount = typeof r?.amount === 'number' ? r.amount : 0
            return sum + amount
          }, 0)
          const refundedAt = refund.created_at ? new Date(refund.created_at).toISOString() : ''

          // Get customer address - build from shipping address fields
          const addressParts = [
            shippingAddress?.address_1,
            shippingAddress?.address_2,
            shippingAddress?.city,
            shippingAddress?.province,
            shippingAddress?.postal_code,
            shippingAddress?.country_code
          ].filter(Boolean)
          const customerAddress = addressParts.length > 0 ? addressParts.join(', ') : ''

          // Get customer name
          const customerName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || ''

          // Get received_at from return entity
          const receivedAt = rr.received_at ? new Date(rr.received_at).toISOString() : ''

          // Get warehouse location from map
          const warehouseLocation = order.stock_location_id 
            ? (warehouseLocationMap.get(order.stock_location_id) || '')
            : ''


          // Get refund additional details from internal_note
          const refundAdditionalDetails = rr.internal_note || ''

          // Get images from return metadata and check for requested refund mode
          let images = ''
          // Handle metadata - it might be an object, JSON string, or null
          let metadata = rr.metadata
          if (typeof metadata === 'string') {
            try {
              metadata = JSON.parse(metadata)
            } catch (e) {
              // If parsing fails, metadata remains a string or we use empty object
              metadata = null
            }
          }
          
          if (metadata?.images) {
            if (Array.isArray(metadata.images)) {
              images = metadata.images.join('; ')
            } else if (typeof metadata.images === 'string') {
              images = metadata.images
            }
          }

          // Get requested refund mode - check metadata first, then refund method type
          // The requested refund mode is what the customer originally requested
          const requestedRefundMode = metadata?.requested_refund_mode || 
                                       metadata?.refund_mode || 
                                       refundMethod?.type || 
                                       ''

          // Get actual refund mode - what was actually used (from refund method)
          const actualRefundMode = refundMethod?.type || ''

          // Get return methods - not available in return entity, use refund method type
          const originalReturnMethod = refundMethod?.type || ''
          const actualReturnMethod = refundMethod?.type || ''

          // Get eligible refund amount from return entity
          const eligibleRefundAmount = rr.refund_amount?.toString() || ''

          // Process return items - create one row per item
          if (rr.items && rr.items.length > 0) {
            for (const returnItem of rr.items) {
              try {
                // Get brand name from map
                const brandName = returnItem.item_id 
                  ? (itemIdToBrandNameMap.get(returnItem.item_id) || '')
                  : ''

                // Get item details from return item
                const item = returnItem.item || {}
                const orderItem = order.items?.find((oi: any) => oi.id === item.id) || item

                // Get reason label from reason_id
                const reasonLabel = returnItem.reason_id ? (reasonIdMap.get(returnItem.reason_id) || '') : ''

                // Get ui_order_set_id from order
                const uiOrderSetId = order.ui_order_id || ''

                const row = createReturnRow(
                rr.id || '',
                serialNumber++,
                customerName,
                customerAddress,
                customer.email || '',
                customer.phone || '',
                rr.created_at ? new Date(rr.created_at).toISOString() : '',
                order.id || '',
                order.display_id?.toString() || '',
                order.created_at ? new Date(order.created_at).toISOString() : '',
                rr.received_at ? new Date(rr.received_at).toISOString() : '',
                paymentGatewayName,
                paymentTransactionId,
                paymentTransactionDate,
                orderPaymentGateway,
                orderItem.title || item.title || '',
                returnItem.quantity || 0,
                returnItem.total_amount || 0,
                orderItem.variant?.sku || item.variant?.sku || '',
                reasonLabel,
                warehouseLocation,
                refundStatus,
                requestedRefundMode,
                actualRefundMode,
                refundAdditionalDetails,
                refundedAt,
                eligibleRefundAmount,
                typeof refundedAmount === 'number' ? refundedAmount.toString() : refundedAmount,
                refundMethod?.bank_detail_id || '',
                refundMethod?.upi_detail_id || '',
                refundMethod?.account_number || '',
                refundMethod?.ifsc_code || '',
                refundMethod?.upi_id || '',
                refundMethod?.account_holder_name || '',
                originalReturnMethod,
                actualReturnMethod,
                images,
                marketplaceOrderId,
                uiOrderSetId,
                brandName
              )

                // Convert row object to array matching header order
                const rowArray = CSV_HEADERS.map(header => row[header] ?? '')
                yield rowArray.map(escapeCSVField).join(',') + '\n'
                rowsGenerated++
              } catch (error) {
                // Continue with next line item
              }
            }
          } else {
            // No items, create a single row
            try {
              // Recalculate address for this case (same logic as above)
              let shippingAddressForNoItems = order.shipping_address || null
              if (!shippingAddressForNoItems && order.customer?.addresses && order.customer.addresses.length > 0) {
                shippingAddressForNoItems = order.customer.addresses[0]
              }
              if (!shippingAddressForNoItems) {
                shippingAddressForNoItems = {}
              }
              
              const addressPartsForNoItems = [
                shippingAddressForNoItems?.address_1,
                shippingAddressForNoItems?.address_2,
                shippingAddressForNoItems?.city,
                shippingAddressForNoItems?.province,
                shippingAddressForNoItems?.postal_code,
                shippingAddressForNoItems?.country_code
              ].filter(Boolean)
              const customerAddressForNoItems = addressPartsForNoItems.length > 0 ? addressPartsForNoItems.join(', ') : ''
              
              // Recalculate metadata and refund modes for this case
              let metadataForNoItems = rr.metadata
              if (typeof metadataForNoItems === 'string') {
                try {
                  metadataForNoItems = JSON.parse(metadataForNoItems)
                } catch (e) {
                  metadataForNoItems = null
                }
              }
              
              const requestedRefundModeForNoItems = metadataForNoItems?.requested_refund_mode || 
                                                     metadataForNoItems?.refund_mode || 
                                                     refundMethod?.type || 
                                                     ''
              const actualRefundModeForNoItems = refundMethod?.type || ''
              
              // Get ui_order_set_id from order
              const uiOrderSetIdForNoItems = order.ui_order_id || ''
              
              const row = createReturnRow(
              rr.id || '',
              serialNumber++,
              customerName,
              customerAddressForNoItems,
              customer.email || '',
              customer.phone || '',
              rr.requested_at ? new Date(rr.requested_at).toISOString() : (rr.created_at ? new Date(rr.created_at).toISOString() : ''),
                order.id || '',
                order.display_id?.toString() || '',
                order.created_at ? new Date(order.created_at).toISOString() : '',
                receivedAt,
                paymentGatewayName,
                paymentTransactionId,
                paymentTransactionDate,
                orderPaymentGateway,
                '',
                0,
                0,
                '',
                rr.internal_note || '',
                warehouseLocation,
                refundStatus,
                requestedRefundModeForNoItems,
                actualRefundModeForNoItems,
                refundAdditionalDetails,
                refundedAt,
                eligibleRefundAmount,
                typeof refundedAmount === 'number' ? refundedAmount.toString() : refundedAmount,
              refundMethod?.bank_detail_id || '',
              refundMethod?.upi_detail_id || '',
              refundMethod?.account_number || '',
              refundMethod?.ifsc_code || '',
              refundMethod?.upi_id || '',
              refundMethod?.account_holder_name || '',
              originalReturnMethod,
              actualReturnMethod,
              images,
              marketplaceOrderId,
              uiOrderSetIdForNoItems,
              '' // brand - empty for no items case
            )

              const rowArray = CSV_HEADERS.map(header => row[header] ?? '')
              yield rowArray.map(escapeCSVField).join(',') + '\n'
              rowsGenerated++
            } catch (error) {
              // Continue with next return
            }
          }
        }

        // Allow garbage collection between batches
        if (i + BATCH_SIZE < returnRequests.length) {
          await new Promise(resolve => setImmediate(resolve))
        }
      }
    }

    // Create a PassThrough stream for S3 upload
    const passThrough = new PassThrough()

    // Generate file name with subdirectory path
    const fileName = `export/returns/returns-export-${Date.now()}-${new Date().toISOString().split('T')[0]}-${generateEntityId()}.csv`

    // Start streaming upload to S3 (non-blocking)
    const uploadPromise = batchUploadToS3Stream([{
      filename: fileName,
      stream: passThrough,
      mimeType: 'text/csv'
    }])

    // Pipe the CSV stream to the PassThrough stream
    const csvStream = Readable.from(generateCSVRows())
    csvStream.pipe(passThrough)

    // Wait for upload to complete
    await uploadPromise

    // Construct the file URL
    if (!process.env.S3_FILE_URL) {
      throw new Error('S3_FILE_URL environment variable is not configured. Cannot construct file URL for export.')
    }
    
    const baseUrl = process.env.S3_FILE_URL.endsWith('/') 
      ? process.env.S3_FILE_URL.slice(0, -1) 
      : process.env.S3_FILE_URL
    const fileUrl = `${baseUrl}/${fileName}`

    return new StepResponse({
      id: fileName,
      url: fileUrl,
      filename: fileName,
      mimeType: 'text/csv'
    })
  }
)

function createReturnRow(
  returnId: string,
  serialNumber: number,
  customerName: string,
  customerAddress: string,
  customerEmail: string,
  customerPhone: string,
  requestedAt: string,
  orderId: string,
  orderNumber: string,
  orderCreatedAt: string,
  receivedAt: string,
  paymentGatewayName: string,
  paymentGatewayTransactionId: string,
  paymentTransactionDate: string,
  orderPaymentGateway: string,
  itemName: string,
  itemQuantity: number,
  itemPrice: number,
  sku: string,
  reason: string,
  warehouseLocation: string,
  refundStatus: string,
  requestedRefundMode: string,
  actualRefundMode: string,
  refundAdditionalDetails: string,
  refundedAt: string,
  eligibleRefundAmount: string,
  refundedAmount: string,
  bankDetailId: string,
  upiDetailId: string,
  accountNumber: string,
  ifscCode: string,
  upiId: string,
  accountHolderName: string,
  originalReturnMethod: string,
  actualReturnMethod: string,
  images: string,
  marketplaceOrderId: string,
  uiOrderSetId: string,
  brand: string
): CSVRow {
  return {
    'return_id': returnId,
    'Serial number': serialNumber,
    'customer_name': customerName,
    'customer_address': customerAddress,
    'customer_email': customerEmail,
    'customer_phone': customerPhone,
    'requested_at': requestedAt,
    'order_id': orderId,
    'order_number': orderNumber,
    'order_created_at': orderCreatedAt,
    'received_at': receivedAt,
    'payment_gateway_name': paymentGatewayName,
    'payment_gateway_transaction_id': paymentGatewayTransactionId,
    'payment_transaction_date': paymentTransactionDate,
    'order_payment_gateway': orderPaymentGateway,
    'item_name': itemName,
    'item_quantity': itemQuantity,
    'item_price': itemPrice,
    'sku': sku,
    'reason': reason,
    'warehouse_location': warehouseLocation,
    'refund_status': refundStatus,
    'requested_refund_mode': requestedRefundMode,
    'actual_refund_mode': actualRefundMode,
    'refund_additional_details': refundAdditionalDetails,
    'refunded_at': refundedAt,
    'eligible_refund_amount': eligibleRefundAmount,
    'refunded_amount': refundedAmount,
    'bank_detail_id': bankDetailId,
    'upi_detail_id': upiDetailId,
    'account_number': accountNumber,
    'ifsc_code': ifscCode,
    'upi_id': upiId,
    'account_holder_name': accountHolderName,
    'original_return_method': originalReturnMethod,
    'actual_return_method': actualReturnMethod,
    'images': images,
    'marketplace_order_id': marketplaceOrderId,
    'ui_order_set_id': uiOrderSetId,
    'brand': brand
  }
}

function escapeCSVField(field: string | number | boolean | null | undefined): string {
  const fieldStr = field === null || field === undefined ? '' : String(field)
  
  if (fieldStr.includes(',') || fieldStr.includes('\n') || fieldStr.includes('\r') || fieldStr.includes('"')) {
    return `"${fieldStr.replace(/"/g, '""')}"`
  }
  return fieldStr
}

