import { createStep, StepResponse } from '@medusajs/workflows-sdk'
import { generateEntityId } from '@medusajs/framework/utils'
import { Readable, PassThrough } from 'stream'
import { batchUploadToS3Stream } from '../../../shared/utils/common'
import {
  getPaidAt,
  getFulfilledAt,
  getAcceptsMarketing,
  getAddressStreet,
  getAddressField,
  getMetadataValue,
  getPaymentMethod,
  getPaymentReference,
  getPaymentId,
  getPaymentReferences,
  getRazorpayOrderId,
  getRefundedAmount,
  getOutstandingBalance,
  escapeCSVField,
  parseMoney,
  aggregateOrderSetLineExtensionsForCsv,
} from '../../shared/utils/order-csv-helpers'
import { formatDates } from '../../../shared/utils/date-utils'
import { roundToTwoDecimals } from '../../../shared/utils/calculate-discount-amount'

/** Sum original_* snapshot only; missing original counts as 0 for this row. */
function sumOriginalField(orders: unknown[], originalKey: string): number {
  let sum = 0
  for (const o of orders) {
    const order = o as Record<string, unknown>
    const n = parseMoney(order[originalKey])
    sum += n ?? 0
  }
  return sum
}

interface GenerateOrderSetCsvInput {
  orderSets?: any[]
  filters?: Record<string, unknown>
}

export const CSV_HEADERS = [
  'Order Set ID',
  'UI Order Set ID',
  'Orderset Created At',
  'Orderset Updated At',
  'Financial Status',
  'Fulfillment Status',
  'Order Total',
  'Currency',
  'Email',
  'Name',
  'Shipping Name',
  'Shipping Address',
  'Shipping City',
  'Shipping Province',
  'Shipping Postal Code',
  'Shipping Country',
  'Shipping Phone',
  'Paid at',
  'Fulfilled at',
  'Accepts Marketing',
  'Subtotal',
  'Shipping',
  'Taxes',
  'Total',
  'Discount Amount',
  'Shipping Street',
  'Shipping Address1',
  'Shipping Address2',
  'Shipping Company',
  'Shipping Zip',
  'Shipping Province Name',
  'Cancelled at',
  'Payment Method',
  'Payment Reference',
  'Refunded Amount',
  'Outstanding Balance',
  // 'Tax 1 Name',
  // 'Tax 1 Value',
  // 'Tax 2 Name',
  // 'Tax 2 Value',
  // 'Tax 3 Name',
  // 'Tax 3 Value',
  // 'Tax 4 Name',
  // 'Tax 4 Value',
  // 'Tax 5 Name',
  // 'Tax 5 Value',
  'Phone',
  'Receipt Number',
  'Payment ID',
  'Payment References',
  'Razorpay Order ID',
  'Delivery Type',
]


export const buildOrderSetRow = (orderSet: any) => {
  const orders = Array.isArray(orderSet.orders) ? orderSet.orders : []
  const firstOrder = orders[0] || {}
  const customer = firstOrder.customer || orderSet.customer || {}
  
  // Use shipping address from cart (order set level) first, fallback to first order's shipping address
  // This avoids duplication and ensures we get the correct shipping address
  const shipping = orderSet.cart?.shipping_address || firstOrder.shipping_address || {}
//   const billing = firstOrder.billing_address || {}

  const extAgg = aggregateOrderSetLineExtensionsForCsv(orders)
  const orderSetTotal: number | '' =
    extAgg.linesWithExtension > 0 ? roundToTwoDecimals(extAgg.itemTotalSum) : ''
  const orderSetSubtotal = sumOriginalField(orders, 'original_subtotal')
  const orderSetShipping = sumOriginalField(orders, 'original_shipping_total')
  const orderSetTaxes = sumOriginalField(orders, 'original_tax_total')
  const orderSetDiscount: number | '' =
    extAgg.discountTotal === null ? '' : extAgg.discountTotal

  // Aggregate payment and fulfillment statuses
  const paymentStatuses = [...new Set(orders.map(o => o.payment_status).filter(Boolean))]
  const fulfillmentStatuses = [...new Set(orders.map(o => o.fulfillment_status).filter(Boolean))]
  const financialStatus = paymentStatuses.join(', ') || ''
  const fulfillmentStatus = fulfillmentStatuses.join(', ') || ''

  // Get earliest paid_at and fulfilled_at from all orders
  const paidAtDates = orders.map(o => getPaidAt(o)).filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d.getTime()))
  const fulfilledAtDates = orders.map(o => getFulfilledAt(o)).filter(Boolean).map(d => new Date(d)).filter(d => !isNaN(d.getTime()))
  const paidAt = paidAtDates.length > 0 ? formatDates(paidAtDates.sort((a, b) => a.getTime() - b.getTime())[0]) : ''
  const fulfilledAt = fulfilledAtDates.length > 0 ? formatDates(fulfilledAtDates.sort((a, b) => a.getTime() - b.getTime())[0]) : ''

  // Aggregate refunded amount from all orders
  const totalRefunded = orders.reduce((sum, order) => {
    const refunded = getRefundedAmount(order)
    return sum + (typeof refunded === 'number' ? refunded : parseFloat(String(refunded)) || 0)
  }, 0)

  // Aggregate outstanding balance from all orders
  const totalOutstanding = orders.reduce((sum, order) => {
    const outstanding = getOutstandingBalance(order)
    return sum + (typeof outstanding === 'number' ? outstanding : parseFloat(String(outstanding)) || 0)
  }, 0)

  const cancelledAt = orderSet.canceled_at ? formatDates(orderSet.canceled_at) : (firstOrder.canceled_at ? formatDates(firstOrder.canceled_at) : '')
  
  // Get payment info from first order (all orders in set share payment collection)
  const paymentMethod = getPaymentMethod(firstOrder)
  const paymentReference = getPaymentReference(firstOrder)
  const paymentId = getPaymentId(firstOrder)
  const paymentReferences = getPaymentReferences(firstOrder)

  // Get phone
  const phone =
    shipping.phone ||
    // billing.phone ||
    customer?.phone ||
    getMetadataValue(firstOrder, 'phone') ||
    getMetadataValue(firstOrder, 'contact_phone')

  // Get receipt number (use order set display_id or first order display_id)
  const receiptNumber = orderSet.display_id || firstOrder.display_id || ''

  // Get Razorpay order ID from first order
  const razorpayOrderId = getRazorpayOrderId(firstOrder)

  // Get delivery type from delivery_detail (attached in export workflow)
  const deliveryType = orderSet.delivery_detail?.delivery_type || ''

  const shippingName = [shipping.first_name, shipping.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  const shippingAddress = [shipping.address_1, shipping.address_2]
    .filter(Boolean)
    .join(', ')
    .trim()

  const customerName = [customer.first_name, customer.last_name]
    .filter(Boolean)
    .join(' ')
    .trim()

  const shippingProvinceName =
    shipping?.province || shipping?.province_code || shipping?.province_name || ''

  return [
    orderSet.id || '',
    orderSet.ui_order_set_id || '',
    orderSet.created_at ? formatDates(orderSet.created_at) : '',
    orderSet.updated_at ? formatDates(orderSet.updated_at) : '',
    financialStatus,
    fulfillmentStatus,
    orderSetTotal,
    firstOrder.currency_code || orderSet.currency_code || '',
    firstOrder.email || customer.email || orderSet.customer?.email || '',
    customerName,
    shippingName,
    shippingAddress,
    shipping.city || '',
    shipping.province || '',
    shipping.postal_code || '',
    shipping.country_code || '',
    shipping.phone || '',
    paidAt,
    fulfilledAt,
    getAcceptsMarketing(customer),
    orderSetSubtotal,
    orderSetShipping,
    orderSetTaxes,
    orderSetTotal,
    orderSetDiscount,
    getAddressStreet(shipping),
    getAddressField(shipping, 'address_1'),
    getAddressField(shipping, 'address_2'),
    getAddressField(shipping, 'company'),
    getAddressField(shipping, 'postal_code'),
    shippingProvinceName,
    cancelledAt,
    paymentMethod,
    paymentReference,
    totalRefunded || '',
    totalOutstanding || '',
    phone,
    receiptNumber,
    paymentId,
    paymentReferences,
    razorpayOrderId,
    deliveryType,
  ]
}

export const generateOrderSetLevelCsvStep = createStep(
  'generate-order-set-level-csv',
  async ({ orderSets }: GenerateOrderSetCsvInput, { container }) => {
    const logger = container.resolve('logger')
    const orderSetList = orderSets ?? []

    // Create a generator function that yields CSV rows
    async function* generateCSVRows() {
      // Yield header row
      yield CSV_HEADERS.map(escapeCSVField).join(',') + '\n'

      // Yield data rows
      for (const orderSet of orderSetList) {
        const row = buildOrderSetRow(orderSet)
        yield row.map(escapeCSVField).join(',') + '\n'
      }
    }

    // Create a PassThrough stream for S3 upload
    const passThrough = new PassThrough()

    // Generate file name with subdirectory path
    const fileName = `export/order-sets/order-sets-export-${Date.now()}-${new Date().toISOString().split('T')[0]}-${generateEntityId()}.csv`

    // Start streaming upload to S3 (non-blocking)
    const uploadPromise = batchUploadToS3Stream([
      {
        filename: fileName,
        stream: passThrough,
        mimeType: 'text/csv',
      },
    ])

    // Pipe the CSV stream to the PassThrough stream
    const csvStream = Readable.from(generateCSVRows())
    csvStream.pipe(passThrough)

    // Wait for upload to complete
    await uploadPromise

    // Construct the file URL
    if (!process.env.S3_FILE_URL) {
      throw new Error(
        'S3_FILE_URL environment variable is not configured. Cannot construct file URL for export.'
      )
    }

    const baseUrl = process.env.S3_FILE_URL.endsWith('/')
      ? process.env.S3_FILE_URL.slice(0, -1)
      : process.env.S3_FILE_URL
    const fileUrl = `${baseUrl}/${fileName}`

    logger.debug(`[order-set-export] export complete: ${fileUrl}`)

    return new StepResponse({
      id: fileName,
      url: fileUrl,
      filename: fileName,
      mimeType: 'text/csv',
    })
  }
)
