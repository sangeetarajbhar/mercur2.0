import * as z from 'zod'

import {
  createFindParams,
  createOperatorMap,
  createSelectParams
} from '@medusajs/medusa/api/utils/validators'

import { requiredQueryString } from '../utils/required-query-string'
import { SELLER_ORDER_LIST_ORDER_STATUS_VALUES } from '../../../utils/constants/seller-order-list-order-status'

const sellerOrderListOrderStatus = z.enum(SELLER_ORDER_LIST_ORDER_STATUS_VALUES)

export type SellerGetOrderParamsType = z.output<typeof SellerGetOrderParams>
export const SellerGetOrderParams = createFindParams({
  offset: 0,
  limit: 50
}).merge(
  z.object({
    seller_id: requiredQueryString('seller_id'),
    created_at: createOperatorMap().optional(),
    /** Filters `order.status`; must match DB `order_status_enum`. */
    status: sellerOrderListOrderStatus.optional(),
    fulfillment_status: z.string().optional(),
    payment_status: z.string().optional(),
    region_id: z.string().optional(),
    sales_channel_id: z.string().optional(),
    q: z.string().optional(),
    pageNumber: z.string().optional(),
    pageSize: z.string().optional(),
    order: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    /** OED rows are filtered to stock_location_ids for this partner (Redis-cached DB list). */
    partnerId: requiredQueryString('partnerId'),
  })
)

export type SellerGetOrderChangesParamsType = z.infer<
  typeof SellerGetOrderChangesParams
>
export const SellerGetOrderChangesParams = createSelectParams()

/**
 * @schema SellerCreateFulfillment
 * type: object
 * properties:
 *   requires_shipping:
 *     type: boolean
 *   location_id:
 *     type: string
 *     description: The location id.
 *   items:
 *     type: array
 *     description: Items to create fulfillment.
 *     items:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         quantity:
 *           type: number
 */
export type SellerCreateFulfillmentType = z.infer<
  typeof SellerCreateFulfillment
>
export const SellerCreateFulfillment = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().int().min(0)
    })
  ),
  requires_shipping: z.boolean(),
  location_id: z.string()
})

/**
 * @schema SellerOrderCreateShipment
 * type: object
 * properties:
 *   items:
 *     type: array
 *     description: Items in the shipment.
 *     items:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         quantity:
 *           type: number
 *   labels:
 *     type: array
 *     description: Labels of the shipment
 *     items:
 *       type: object
 *       properties:
 *         tracking_number:
 *           type: string
 *         tracking_url:
 *           type: string
 *         label_url:
 *           type: string
 */
export type SellerOrderCreateShipmentType = z.infer<
  typeof SellerOrderCreateShipment
>
export const SellerOrderCreateShipment = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      quantity: z.number()
    })
  ),
  labels: z
    .array(
      z.object({
        tracking_number: z.string(),
        tracking_url: z.string(),
        label_url: z.string()
      })
    )
    .optional()
})
