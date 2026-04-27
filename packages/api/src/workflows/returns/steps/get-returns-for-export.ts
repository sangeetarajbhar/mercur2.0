import { ContainerRegistrationKeys, remoteQueryObjectFromString } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { CUSTOMER_REFUND_METHODS_MODULE } from '../../../modules/customer_refund_methods'
import CustomerRefundMethodModuleService from '../../../modules/customer_refund_methods/service'
import { Logger } from '@medusajs/framework/types'
import orderSetOrder from '../../../links/order-set-order'
import {
  BankAccountType,
  CustomerBankDetailStatus,
  CustomerUpiDetailStatus
} from '../../../utils/constants/bank_account_verification'
import { ReturnRefundTypeLinkStatus } from '../../../utils/constants/return_refund_type_link'
import { decryptFromStorage } from '../../../modules/customer_refund_methods/utils/encryption'
import { RETURN_REFUND_TYPE_LINK_MODULE } from '../../../modules/return-refund-type-link'
import ReturnRefundTypeLinkModuleService from '../../../modules/return-refund-type-link/service'
import { CUSTOMER_BANK_MODULE } from '../../../modules/customer-bank-detail'
import CustomerBankModuleService from '../../../modules/customer-bank-detail/service'
import { CUSTOMER_UPI_MODULE } from '../../../modules/customer-upi-detail'
import CustomerUpiModuleService from '../../../modules/customer-upi-detail/service'

interface ExportFilters {
  status?: string
  created_at?: string | { start_date?: string; end_date?: string }
  updated_at?: string | { start_date?: string; end_date?: string }
  customer_id?: string
  order_id?: string
}

interface RefundMethod {
  id: string
  return_id?: string
  order_id?: string
  customer_id?: string
  bank_detail_id?: string
  upi_detail_id?: string
  account_number?: string
  ifsc_code?: string
  account_holder_name?: string
  upi_id?: string
  type?: string
  [key: string]: unknown
}

interface ReturnRequest {
  id?: string
  order_id?: string
  order?: any
  [key: string]: unknown
}

interface Order {
  id: string
  customer_id?: string
  customer?: {
    addresses?: any[]
  }
  [key: string]: unknown
}

const VALID_RETURN_STATUSES = ['requested', 'received', 'canceled', 'refunded'] as const
const PAGE_SIZE = 200

const RETURN_FIELDS = [
  'id',
  'order_id',
  'status',
  'refund_amount',
  'location_id',
  'no_notification',
  'internal_note',
  'created_at',
  'updated_at',
  'canceled_at',
  'requested_at',
  'received_at',
  'metadata',
  'items.*',
]

const ORDER_FIELDS = [
  'id',
  'display_id',
  'created_at',
  'customer_id',
  'currency_code',
  'customer.*',
  'shipping_address.*',
  'shipping_address.address_1',
  'shipping_address.address_2',
  'shipping_address.city',
  'shipping_address.province',
  'shipping_address.postal_code',
  'shipping_address.country_code',
  'payment_collections.*',
  'payment_collections.payments.*',
  'payment_collections.payments.refunds.*',
  'items.*',
  'items.variant.*',
  // 'order_extra_detail.marketplace_order_id'
]

const ADDRESS_FIELDS = [
  'id',
  'customer_id',
  'address_1',
  'address_2',
  'city',
  'province',
  'country_code',
  'postal_code',
]

function buildReturnFilters(filters: ExportFilters, logger: Logger): Record<string, unknown> {
  const returnFilters: Record<string, unknown> = {}

  if (filters.status) {
    if (VALID_RETURN_STATUSES.includes(filters.status as typeof VALID_RETURN_STATUSES[number])) {
      returnFilters.status = filters.status
    } else {
      logger.warn(
        `[Returns Export] Invalid status '${filters.status}' provided. Valid statuses are: ${VALID_RETURN_STATUSES.join(', ')}. Skipping status filter.`
      )
    }
  }

  // Handle created_at date filter - convert start_date/end_date to $gte/$lte format for remoteQuery
  if (filters.created_at) {
    let createdAtFilter: { $gte?: string; $lte?: string } | undefined
    if (typeof filters.created_at === 'string') {
      try {
        const parsed = JSON.parse(filters.created_at)
        if (parsed && typeof parsed === 'object') {
          createdAtFilter = {}
          if (parsed.start_date) {
            createdAtFilter.$gte = parsed.start_date
          }
          if (parsed.end_date) {
            createdAtFilter.$lte = parsed.end_date
          }
        }
      } catch {
        // If parsing fails, skip the filter
      }
    } else if (typeof filters.created_at === 'object') {
      createdAtFilter = {}
      if (filters.created_at.start_date) {
        createdAtFilter.$gte = filters.created_at.start_date
      }
      if (filters.created_at.end_date) {
        createdAtFilter.$lte = filters.created_at.end_date
      }
    }
    if (createdAtFilter && (createdAtFilter.$gte || createdAtFilter.$lte)) {
      returnFilters.created_at = createdAtFilter
    }
  }

  // Handle updated_at date filter - convert start_date/end_date to $gte/$lte format for remoteQuery
  if (filters.updated_at) {
    let updatedAtFilter: { $gte?: string; $lte?: string } | undefined
    if (typeof filters.updated_at === 'string') {
      try {
        const parsed = JSON.parse(filters.updated_at)
        if (parsed && typeof parsed === 'object') {
          updatedAtFilter = {}
          if (parsed.start_date) {
            updatedAtFilter.$gte = parsed.start_date
          }
          if (parsed.end_date) {
            updatedAtFilter.$lte = parsed.end_date
          }
        }
      } catch {
        // If parsing fails, skip the filter
      }
    } else if (typeof filters.updated_at === 'object') {
      updatedAtFilter = {}
      if (filters.updated_at.start_date) {
        updatedAtFilter.$gte = filters.updated_at.start_date
      }
      if (filters.updated_at.end_date) {
        updatedAtFilter.$lte = filters.updated_at.end_date
      }
    }
    if (updatedAtFilter && (updatedAtFilter.$gte || updatedAtFilter.$lte)) {
      returnFilters.updated_at = updatedAtFilter
    }
  }

  if (filters.order_id) returnFilters.order_id = filters.order_id

  return returnFilters
}

async function fetchReturnsWithPagination(
  remoteQuery: any,
  returnFilters: Record<string, unknown>,
  container: any,
  logger: Logger
): Promise<ReturnRequest[]> {
  const returnRequests: ReturnRequest[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const queryObject = remoteQueryObjectFromString({
      entryPoint: 'returns',
      variables: {
        filters: returnFilters,
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
      },
      fields: RETURN_FIELDS,
    })

    const result = await remoteQuery(queryObject)
    const pageReturns = (result.rows || []) as ReturnRequest[]
    returnRequests.push(...pageReturns)

    hasMore = pageReturns.length === PAGE_SIZE
    page++

    if (hasMore) {
      await new Promise(resolve => setImmediate(resolve))
    }
  }

  // Collect all item_ids from all return requests' items arrays
  const allItemIds: string[] = []
  for (const returnRequest of returnRequests) {
    if (returnRequest.items && Array.isArray(returnRequest.items)) {
      for (const item of returnRequest.items) {
        if (item.item_id) {
          allItemIds.push(item.item_id)
        }
      }
    }
  }

  // Query order_line_item_extension for all item_ids
  const itemExtensionMap = new Map<string, any>()
  if (allItemIds.length > 0) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    try {
      const { data: lineItemExtensions } = await query.graph({
        entity: 'order_line_item_extension',
        fields: ['*'],
        filters: {
          order_line_item_id: allItemIds,
        },
      })

      if (lineItemExtensions && Array.isArray(lineItemExtensions)) {
        for (const extension of lineItemExtensions) {
          if (extension.order_line_item_id) {
            itemExtensionMap.set(extension.order_line_item_id, extension)
          }
        }
      }
    } catch (error) {
      logger.warn(
        `Could not fetch order_line_item_extension: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // Attach order_line_item_extension to items
  for (const returnRequest of returnRequests) {
    if (returnRequest.items && Array.isArray(returnRequest.items)) {
      for (const item of returnRequest.items) {
        if (item.item_id && itemExtensionMap.has(item.item_id)) {
          item.total_amount = itemExtensionMap.get(item.item_id)?.item_total || 0
        }
      }
    }
  }

  return returnRequests
}

async function fetchOrders(
  remoteQuery: any,
  orderIds: string[],
  logger: Logger
): Promise<Map<string, Order>> {
  const ordersMap = new Map<string, Order>()

  if (orderIds.length === 0) {
    return ordersMap
  }

  // Query order_extra_detail to get marketplace_order_id for all orderIds
  const marketplaceOrderIdMap = new Map<string, {marketplace_order_id: string, stock_location_id: string}>()
  try {
    const orderExtraDetailQueryObject = {
      entryPoint: 'order_extra_detail',
      fields: ['order_id', 'marketplace_order_id', 'stock_location_id'],
      variables: {
        filters: {
          order_id: orderIds,
        },
      },
    }

    const orderExtraDetails = await remoteQuery(orderExtraDetailQueryObject)
    const orderExtraDetailsArray = Array.isArray(orderExtraDetails) ? orderExtraDetails : []

    orderExtraDetailsArray.forEach((detail: { order_id: string; marketplace_order_id: string, stock_location_id: string }) => {
      if (detail?.order_id && detail?.marketplace_order_id) {
        marketplaceOrderIdMap.set(detail.order_id, {marketplace_order_id: detail.marketplace_order_id, stock_location_id: detail.stock_location_id})
      }
    })

  } catch (error) {
    logger.warn(
      `Could not fetch order_extra_detail: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // Query order-set-order to get ui_order_id for all orderIds
  const uiOrderIdMap = new Map<string, string>()
  try {
    const orderSetOrderQueryObject = {
      entryPoint: orderSetOrder.entryPoint,
      fields: ['order_id', 'order_set.ui_order_set_id'],
      variables: {
        filters: {
          order_id: orderIds,
        },
      },
    }

    const orderSetOrders = await remoteQuery(orderSetOrderQueryObject)
    const orderSetOrdersArray = Array.isArray(orderSetOrders) ? orderSetOrders : []

    orderSetOrdersArray.forEach((link: { order_id: string; order_set?: { ui_order_set_id: string } }) => {
      if (link?.order_id && link?.order_set?.ui_order_set_id) {
        uiOrderIdMap.set(link.order_id, link.order_set.ui_order_set_id)
      }
    })

  } catch (error) {
    logger.warn(
      `Could not fetch order-set-order: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  const orderQueryObject = {
    entryPoint: 'order',
    fields: ORDER_FIELDS,
    variables: {
      filters: {
        id: orderIds,
      },
    },
  }

  try {
    const orderResult = await remoteQuery(orderQueryObject)
    const orders = (Array.isArray(orderResult) ? orderResult : []) as Order[]

    orders.forEach(order => {
      if (order?.id) {
        // Assign marketplace_order_id if it exists in the map before adding to ordersMap
        if (marketplaceOrderIdMap.has(order.id)) {
          order.marketplace_order_id = marketplaceOrderIdMap.get(order.id)?.marketplace_order_id
          order.stock_location_id = marketplaceOrderIdMap.get(order.id)?.stock_location_id
        }

        // Assign ui_order_id if it exists in the map
        if (uiOrderIdMap.has(order.id)) {
          order.ui_order_id = uiOrderIdMap.get(order.id)
        }

        ordersMap.set(order.id, order)
      }
    })
  } catch (error) {
    logger.error(
      `Could not fetch orders via remote query: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return ordersMap
}

async function fetchCustomerAddresses(
  remoteQuery: any,
  customerIds: string[],
  logger: Logger
): Promise<Map<string, any[]>> {
  const customerAddressesMap = new Map<string, any[]>()

  if (customerIds.length === 0) {
    return customerAddressesMap
  }

  const addressQueryObject = {
    entryPoint: 'customer_address',
    fields: ADDRESS_FIELDS,
    variables: {
      filters: {
        customer_id: customerIds,
      },
    },
  }

  try {
    const addressResult = await remoteQuery(addressQueryObject)
    const addresses = Array.isArray(addressResult) ? addressResult : []

    addresses.forEach((address: any) => {
      if (!address?.customer_id) return

      if (!customerAddressesMap.has(address.customer_id)) {
        customerAddressesMap.set(address.customer_id, [])
      }

      customerAddressesMap.get(address.customer_id)!.push(address)
    })
  } catch (error) {
    logger.error(
      `Could not fetch customer addresses via remote query: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  return customerAddressesMap
}

function attachAddressesToOrders(
  ordersMap: Map<string, Order>,
  customerAddressesMap: Map<string, any[]>
): void {
  ordersMap.forEach(order => {
    if (order.customer_id && customerAddressesMap.has(order.customer_id)) {
      const addresses = customerAddressesMap.get(order.customer_id) || []
      if (order.customer) {
        order.customer.addresses = addresses
      }
    }
  })
}

function attachOrdersToReturns(
  returnRequests: ReturnRequest[],
  ordersMap: Map<string, Order>,
  logger: Logger
): void {
  returnRequests.forEach(returnRequest => {
    if (returnRequest.order_id && ordersMap.has(returnRequest.order_id)) {
      returnRequest.order = ordersMap.get(returnRequest.order_id)
    } else if (returnRequest.order_id) {
      logger.warn(
        `[Returns Export] Order ${returnRequest.order_id} not found in ordersMap for return ${returnRequest.id}`
      )
    }
  })
}

async function fetchRefundMethods(
  container: any,
  returnIds: Array<{ return_id: string; order_id?: string }>,
  logger: Logger
): Promise<Record<string, RefundMethod>> {
  const refundMethodByReturnId: Record<string, RefundMethod> = {}

  if (returnIds.length === 0) {
    return refundMethodByReturnId
  }

  try {
    const returnRefundTypeLinkService = container.resolve(
      RETURN_REFUND_TYPE_LINK_MODULE
    ) as ReturnRefundTypeLinkModuleService

    const customerUpiService = container.resolve(
      CUSTOMER_UPI_MODULE
    ) as CustomerUpiModuleService

    const customerBankService = container.resolve(
      CUSTOMER_BANK_MODULE
    ) as CustomerBankModuleService

    const customerRefundMethodService = container.resolve(
      CUSTOMER_REFUND_METHODS_MODULE
    ) as CustomerRefundMethodModuleService

    const refundMethodPromises = returnIds.map(async ({ return_id, order_id }) => {
      try {
        // New mapping first: return_refund_type_link -> customer_upi_detail/customer_bank_detail
        const linkRows = await returnRefundTypeLinkService.listReturnRefundTypeLinks(
          {
            return_id,
            status: ReturnRefundTypeLinkStatus.ACTIVE,
          },
          {
            select: ['id', 'return_id', 'type', 'type_id', 'customer_id', 'status'],
          }
        )
        const link = linkRows?.[0]

        if (link?.type === BankAccountType.UPI && link?.type_id) {
          const upiRows = await customerUpiService.listCustomerUpiDetails(
            {
              id: link.type_id,
              deleted_at: null,
              status: CustomerUpiDetailStatus.ACTIVE,
            },
            {
              select: ['id', 'upi_id_enc', 'masked_upi', 'status', 'created_at'],
            }
          )
          const upi = upiRows?.[0]
          if (upi) {
            let upiId = ''
            if (upi.upi_id_enc && typeof upi.upi_id_enc === 'string') {
              try {
                // upiId = decryptFromStorage(upi.upi_id_enc)
                const isMasked = process.env.DISPLAY_MASKED_UPI_BANK_DETAILS || 'true'
                if (isMasked === 'true') {
                  upiId = decryptFromStorage(upi.upi_id_enc)
                } else {
                  upiId = upi.masked_upi
                }
              } catch {
                upiId = upi.upi_id_enc
              }
            }
            return [
              {
                id: upi.id,
                return_id,
                type: BankAccountType.UPI,
                upi_detail_id: upi.id,
                upi_id: upiId,
              } as RefundMethod,
            ]
          }
        }

        if (link?.type === BankAccountType.BANK && link?.type_id) {
          const bankRows = await customerBankService.listCustomerBankDetails(
            {
              id: link.type_id,
              deleted_at: null,
              status: CustomerBankDetailStatus.ACTIVE,
            },
            {
              select: [
                'id',
                'account_number_enc',
                'account_holder_enc',
                'ifsc_code',
                'masked_account',
                'masked_holder',
                'status',
                'created_at',
              ],
            }
          )
          const bank = bankRows?.[0]
          if (bank) {
            let accountNumber = ''
            if (bank.account_number_enc && typeof bank.account_number_enc === 'string') {
              try {
                // accountNumber = decryptFromStorage(bank.account_number_enc)
                const isMasked = process.env.DISPLAY_MASKED_UPI_BANK_DETAILS || 'true'
                if (isMasked === 'true') {
                  accountNumber = decryptFromStorage(bank.account_number_enc)
                } else {
                  accountNumber = bank.masked_account
                }
              } catch {
                accountNumber = bank.account_number_enc
              }
            }

            let accountHolderName = ''
            if (bank.account_holder_enc && typeof bank.account_holder_enc === 'string') {
              try {
                // accountHolderName = decryptFromStorage(bank.account_holder_enc)
                const isMasked = process.env.DISPLAY_MASKED_UPI_BANK_DETAILS || 'true'
                if (isMasked === 'true') {
                  accountHolderName = decryptFromStorage(bank.account_holder_enc)
                } else {
                  accountHolderName = bank.masked_holder
                }
              } catch {
                accountHolderName = bank.account_holder_enc
              }
            }

            return [
              {
                id: bank.id,
                return_id,
                type: BankAccountType.BANK,
                bank_detail_id: bank.id,
                account_number: accountNumber,
                account_holder_name: accountHolderName,
                ifsc_code: bank.ifsc_code ?? '',
              } as RefundMethod,
            ]
          }
        }

        // Fallback for old records mapping
        let methodsList = await customerRefundMethodService.listCustomerRefundMethods({
          return_id,
          deleted_at: null,
        })

        if (methodsList.length === 0 && order_id) {
          methodsList = await customerRefundMethodService.listCustomerRefundMethods({
            order_id,
            deleted_at: null,
          })
        }

        const decryptedMethods = await Promise.all(
          methodsList.map(async (method: { id: string }) => {
            try {
              const decrypted = await customerRefundMethodService.decryptRefundMethod(method.id)
              const methodType = (decrypted as { type?: string })?.type
              const legacyMappedIds =
                methodType === BankAccountType.UPI
                  ? { upi_detail_id: method.id }
                  : methodType === BankAccountType.BANK
                    ? { bank_detail_id: method.id }
                    : {}
              return {
                ...decrypted,
                ...legacyMappedIds,
                id: method.id,
                return_id
              } as RefundMethod
            } catch (error) {
              logger.warn(
                `Could not decrypt refund method ${method.id}: ${
                  error instanceof Error ? error.message : String(error)
                }`
              )
              return null
            }
          })
        )

        return decryptedMethods.filter(method => method !== null) as RefundMethod[]
      } catch (error) {
        logger.warn(
          `Could not fetch refund methods for return ${return_id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
        return []
      }
    })

    const refundMethodArrays = await Promise.all(refundMethodPromises)
    const refundMethods = refundMethodArrays.flat()

    refundMethods.forEach(method => {
      if (method.return_id) {
        refundMethodByReturnId[method.return_id] = method
      }
    })
  } catch (error) {
    logger.warn(
      `Could not fetch refund methods: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  return refundMethodByReturnId
}

export const getReturnsForExportStep = createStep(
  'get-returns-for-export',
  async (filters: ExportFilters, { container }) => {
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    // Build and validate filters
    const returnFilters = buildReturnFilters(filters, logger)

    // Fetch returns with pagination
    const returnRequests = await fetchReturnsWithPagination(remoteQuery, returnFilters, container, logger)


    // Extract unique order IDs
    const uniqueOrderIds = [
      ...new Set(returnRequests.map(rr => rr.order_id).filter(Boolean) as string[]),
    ]

    // Fetch orders
    const ordersMap = await fetchOrders(remoteQuery, uniqueOrderIds, logger)

    // Extract unique customer IDs from orders
    const uniqueCustomerIds = [
      ...new Set(
        Array.from(ordersMap.values())
          .map(order => order.customer_id)
          .filter(Boolean) as string[]
      ),
    ]

    // Fetch customer addresses
    const customerAddressesMap = await fetchCustomerAddresses(
      remoteQuery,
      uniqueCustomerIds,
      logger
    )

    // Attach addresses to orders
    attachAddressesToOrders(ordersMap, customerAddressesMap)

    // Attach orders to return requests
    attachOrdersToReturns(returnRequests, ordersMap, logger)

    // Prepare return IDs for refund method lookup
    const returnIds: Array<{ return_id: string; order_id?: string }> = returnRequests
      .filter(rr => rr.id)
      .map(rr => ({
        return_id: rr.id!,
        order_id: rr.order_id,
      }))

    // Fetch refund methods
    const refundMethodByReturnId = await fetchRefundMethods(container, returnIds, logger)

    return new StepResponse({
      returnRequests,
      refundMethodByReturnId,
    })
  }
)
