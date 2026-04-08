import { createStep, StepResponse } from '@medusajs/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { getFormattedOrderSetListWorkflow } from '../workflows/get-formatted-order-set-list'
import { OrderSetExportFilters } from './utils/types'
import { CSV_HEADERS, buildOrderSetRow } from './generate-order-set-level-csv'
import { createCsvStream } from '../../shared/utils/csv-stream-helper'
import {
  normalizeToArray,
  normalizeOrder,
} from '../../shared/utils/filter-normalizers'
import { normalizeDateFilter } from '../../../shared/utils/validate-date-range'
import { orderSetCsvExportOrdersNestedFields } from '../../../api/admin/v2/order-sets/query-config'

const PAGE_SIZE = 200

export const exportOrderSetsLevelStreamingStep = createStep(
  'export-order-sets-level-streaming',
  async (filters: OrderSetExportFilters = {}, { container }) => {
    const logger = container.resolve('logger')
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Build filters for order sets
    const normalizedFilters: Record<string, unknown> = {
      deleted_at: {
        $eq: null,
      },
    }

    if (filters.created_at) {
      normalizedFilters.created_at = normalizeDateFilter(filters.created_at)
    }

    if (filters.updated_at) {
      normalizedFilters.updated_at = normalizeDateFilter(filters.updated_at)
    }

    if (filters.status) {
      const normalizedStatus = normalizeToArray(filters.status)
      if (normalizedStatus && normalizedStatus.length) {
        normalizedFilters.status = normalizedStatus
      }
    }

    // Handle delivery_type filter by querying order_delivery_detail
    let filteredOrderSetIds: string[] | undefined = undefined
    if (filters.delivery_type) {
      const normalizedDeliveryTypes = normalizeToArray(filters.delivery_type)

      if (normalizedDeliveryTypes) {
        const deliveryTypeFilter =
          Array.isArray(normalizedDeliveryTypes) &&
          normalizedDeliveryTypes.length === 1
            ? normalizedDeliveryTypes[0]
            : normalizedDeliveryTypes

        const { data: deliveryDetails } = await query.graph({
          entity: 'order_delivery_detail',
          fields: ['order_set_id'],
          filters: {
            deleted_at: {
              $eq: null,
            },
            ...(Array.isArray(deliveryTypeFilter)
              ? { delivery_type: deliveryTypeFilter }
              : { delivery_type: deliveryTypeFilter }),
          },
        })

        filteredOrderSetIds = (deliveryDetails || [])
          .map((d: any) => d.order_set_id)
          .filter(Boolean)

        if (!filteredOrderSetIds.length) {
          // Create empty CSV file
          const csvStream = createCsvStream({
            fileNamePrefix: 'order-sets-export',
            subdirectory: 'export/order-sets',
            headers: CSV_HEADERS,
          })
          csvStream.writeHeader()
          const result = await csvStream.finish()
          return new StepResponse(result)
        }

        normalizedFilters.id = filteredOrderSetIds
      }
    }

    const orderBy = normalizeOrder(filters.order)

    // Create CSV stream
    const csvStream = createCsvStream({
      fileNamePrefix: 'order-sets-export',
      subdirectory: 'export/order-sets',
      headers: CSV_HEADERS,
    })
    csvStream.writeHeader()

    // Process order sets in batches and stream CSV
    let skip = 0
    let hasMore = true

    while (hasMore) {
      const { result } = await getFormattedOrderSetListWorkflow(container).run({
        input: {
          fields: [
            'orders.shipping_address.*',
            'orders.payment_collections.*',
            'orders.payment_collections.payments.*',
            'orders.payment_collections.payments.data',
            'orders.payment_collections.payments.refunds.*',
            // Original shipping snapshots — order-set CSV aggregation (not in shared workflow defaults)
            'orders.original_shipping_total',
            'orders.original_shipping_subtotal',
            'orders.original_shipping_tax_total',
            'orders.summary.original_order_total',
            'orders.summary.pending_difference',
            'orders.summary.current_order_total',
            'orders.split_order_payment.captured_amount',
            'orders.split_order_payment.refunded_amount',
            ...orderSetCsvExportOrdersNestedFields,
          ],
          filters: normalizedFilters,
          pagination: {
            skip,
            take: PAGE_SIZE,
            order: orderBy,
          },
        },
      })

      const workflowResult = result as { data?: any[] }
      const pageOrderSets = workflowResult.data || []

      if (pageOrderSets.length === 0) {
        break
      }

      // Fetch delivery details for this batch
      const batchOrderSetIds = pageOrderSets.map((os: any) => os.id).filter(Boolean)
      const deliveryDetailsMap = new Map<string, any>()

      if (batchOrderSetIds.length > 0) {
        const { data: deliveryDetails } = await query.graph({
          entity: 'order_delivery_detail',
          fields: [
            'id',
            'order_set_id',
            'delivery_type',
            'delivery_date',
            'start_time',
            'end_time',
            'slot_id',
          ],
          filters: {
            order_set_id: batchOrderSetIds,
            deleted_at: {
              $eq: null,
            },
          },
        })

        if (deliveryDetails && Array.isArray(deliveryDetails)) {
          deliveryDetails.forEach((detail: any) => {
            if (detail.order_set_id) {
              deliveryDetailsMap.set(detail.order_set_id, detail)
            }
          })
        }
      }

      // Attach delivery details to order sets and build rows
      const batchRows: any[][] = []
      for (const orderSet of pageOrderSets) {
        const deliveryDetail = deliveryDetailsMap.get(orderSet.id)
        const orderSetWithDelivery = {
          ...orderSet,
          orders: Array.isArray(orderSet.orders) ? orderSet.orders : [],
          delivery_detail: deliveryDetail || null,
        }
        const row = buildOrderSetRow(orderSetWithDelivery)
        batchRows.push(row)
      }

      // Stream this batch to CSV
      csvStream.writeBatch(batchRows)

      hasMore = pageOrderSets.length === PAGE_SIZE
      skip += PAGE_SIZE

      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }

    // Finish streaming and return result
    const result = await csvStream.finish()

    logger.debug(`[order-sets-level-export] export complete: ${result.url}`)

    return new StepResponse(result)
  }
)

