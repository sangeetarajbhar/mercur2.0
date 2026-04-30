import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import { adminCreateReturnOrderWorkflow } from '../../../../workflows/returns/workflows/admin-create-return-order'
import { AdminPostReturnsV2ReqSchemaType } from './validators'
import OrderLineItemExtensionModuleService from '../../../../modules/order-line-item-extension/service'
import { ORDER_LINE_ITEM_EXTENSION_MODULE } from '../../../../modules/order-line-item-extension'
import { OrderLineItemStatus } from '../../../../utils/constants/order-statuses'
import CustomerRefundMethodModuleService from '../../../../modules/customer_refund_methods/service'
import { CUSTOMER_REFUND_METHODS_MODULE } from '../../../../modules/customer_refund_methods'
import { Knex } from 'knex'
import { HttpTypes } from "@medusajs/framework/types"
import { constructS3Url, extractRelativePath } from "../../../../shared/utils/common"
import { getOrderReturnLocationIds } from '../../../utils/get-order-return-location-ids'


/**
 * @oas [post] /admin/returns/v2
 * operationId: "AdminCreateReturnV2"
 * summary: "Create a Return (Admin V2)"
 * description: "Creates a new return for a specific order line item using orderId and orderLineItemId."
 * x-authenticated: true
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminCreateReturnV2"
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             return:
 *               type: object
 *               description: The created return object
 * tags:
 *   - Admin
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 * @since 2.8.0
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdminPostReturnsV2ReqSchemaType>,
  res: MedusaResponse
) => {
  const { orderId, orderLineItemId, reason_id, note, receive_now, refund_method_id } =
    req.validatedBody as AdminPostReturnsV2ReqSchemaType

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const eventBus = req.scope.resolve('event_bus')
  const logger = req.scope.resolve('logger')

  // Get shipping_methods with detail objects and verify order exists
  const { data: [order] } = await query.graph({
    entity: 'order',
    fields: [
      'id',
      'customer_id',
      'shipping_methods.*'
    ],
    filters: {
      id: orderId
    }
  })

  if (!order) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order with id ${orderId} not found`
    )
  }

  // Find shipping_method where detail.return_id is null
  const shippingMethod = order.shipping_methods?.find((method: any) => 
    method.detail?.return_id === null || method.detail?.return_id === undefined
  )

  if (!shippingMethod) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'No shipping method found'
    )
  }

  const shippingOptionId = shippingMethod?.shipping_option_id

  if (!shippingOptionId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'No shipping option found'
    )
  }

  // Verify the order line item exists and belongs to the order
  const { data: orderLineItems } = await query.graph({
    entity: 'order_line_item',
    fields: ['id', 'order_id', 'title'],
    filters: {
      id: orderLineItemId,
      // order_id: orderId
    }
  })

  if (!orderLineItems || orderLineItems.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order line item with id ${orderLineItemId} not found in order ${orderId}`
    )
  }

  const { return_location_id } = await getOrderReturnLocationIds(query, orderId)

  try {
    // Run the admin create return workflow
    const workflow = adminCreateReturnOrderWorkflow(req.scope)

    logger.debug(`shippingOptionId: ${shippingOptionId}`)
    logger.debug(`orderId: ${orderId}`)
    logger.debug(`orderLineItemId: ${orderLineItemId}`)

    const { result } = await workflow.run({
      input: {
        orderId,
        orderLineItemId,
        reason_id,
        note,
        receive_now,
        location_id: return_location_id,
        return_shipping: {
          option_id: shippingOptionId
        }
      }
    })

    // Update order line item extension status after successful return creation
    if (result && result?.id) {
      const { data: [returns] } = await query.graph({
        entity: 'return',
        fields: ['items.item_id'],
        filters: {
          id: result.id,
        },
      })

      const itemId = returns?.items[0]?.item_id

      if (itemId) {
        const orderLineItemExtensionService = req.scope.resolve(ORDER_LINE_ITEM_EXTENSION_MODULE) as OrderLineItemExtensionModuleService
        
        await orderLineItemExtensionService.updateOrderLineItemExtensions({
          selector: { order_line_item_id: itemId },
          data: {
            returnable_flag: false,
            status: OrderLineItemStatus.RETURNED,
          }
        })
      }
    }

      // Link return to refund method if refund_method_id is provided
  if (refund_method_id && result?.id) {

    const customerRefundMethodService = req.scope.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE)
    const customerId = result?.order?.customer_id

    if(!customerId) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Customer not found"
      )
    }
    
    try {
      // Verify the refund method exists and belongs to the customer
      // This will throw MedusaError if not found
      const existingRefundMethod = await customerRefundMethodService.retrieveCustomerRefundMethod(refund_method_id, {
        select: ["id", "customer_id", "deleted_at"]
      })


      // Check if refund method is deleted
      if (existingRefundMethod.deleted_at) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          "Refund method has been deleted"
        )
      }

      // Verify the refund method belongs to the customer (if customer context is available)
      if (customerId && existingRefundMethod.customer_id !== customerId) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          "Refund method not found"
        )
      }

      // Create the link if refund method exists and is valid
      const linkService = req.scope.resolve(ContainerRegistrationKeys.LINK)
      
      await linkService.create({
        [Modules.ORDER]: {
          return_id: result.id
        },
        [CUSTOMER_REFUND_METHODS_MODULE]: {
          customer_refund_method_id: refund_method_id
        }
      })
   
    } catch (error) {
      // If it's a MedusaError (like NOT_FOUND), rethrow it to return proper error response
      if (error instanceof MedusaError) {
        throw error
      }
      // For other unexpected errors, log and continue (don't fail the return creation)
      logger.error('Error verifying or creating return-refund-method link:', error)
    }
  }

    await eventBus.emit({
      name: "return_requested",
      data: {
        order_id: orderId,
        product_name: result?.order?.items?.[0]?.title|| 'NA' 
      }
    })
  
    await eventBus.emit({
      name: "return_created",
      data: {
        order_id: orderId,
        items: orderLineItems,
      }
    })

    res.status(200).json({ 
      return: result,
      message: 'Return created successfully'
    })
  } catch (error) {
    logger.error('Error creating admin return:', error)
    
    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to create return: ${error.message}`
    )
  }
}

export const GET = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminOrderFilters>,
  res: MedusaResponse<HttpTypes.AdminReturnsResponse>
) => {
  const logger = req.scope.resolve('logger')
  logger.debug('[RETURNS V2 ROUTE] GET endpoint called - starting processing')

  const orderModuleService = req.scope.resolve(Modules.ORDER)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Knex

  // Get pagination parameters
  const skip = Number(req.query.skip) ?? 0
  const take = Number(req.query.take) ?? 20 

  // Get search query and status filter
  // const searchQuery = req.query?.q as string | undefined
  const searchQuery = req.query?.phone || req.query?.marketplace_order_id || undefined as string | undefined
  const statusFilter = req.query?.status as string | undefined || req.filterableFields?.status as string | undefined
  
  // Parse created_at date filter from query parameters
  let created_at: { start_date?: string; end_date?: string } | undefined
  if (req.query?.created_at) {
    if (typeof req.query.created_at === 'string') {
      try {
        created_at = JSON.parse(req.query.created_at)
      } catch {
        created_at = undefined
      }
    } else {
      created_at = req.query.created_at as { start_date?: string; end_date?: string }
    }
  }

  // Build the Knex query matching the SQL
  let query = knex('return as r')
    .select(
      'r.*',
      'oli.title',
      'oli.variant_title',
      'oli.variant_sku',
      'oli.thumbnail as oli_thumbnail', // Explicitly alias to avoid conflict
      'c.email',
      'c.phone'
    )
    .join('order as o', 'r.order_id', 'o.id')
    .leftJoin('customer as c', 'c.id', 'o.customer_id')
    .join('return_item as ri', 'ri.return_id', 'r.id')
    .join('order_line_item as oli', 'ri.item_id', 'oli.id')
    .join('order_extra_detail as oe', 'oe.order_id', 'r.order_id')
    .whereNull('r.deleted_at')
    .whereNull('o.deleted_at')

  // Apply search filter if provided
  if (searchQuery) {
    const searchPattern = `${searchQuery}`
    if(req.query?.phone) {
      query = query.where('c.phone', searchPattern)
    } else{
      query = query.where('oe.marketplace_order_id', searchPattern)
    }
  }

  // Apply status filter if provided
  if (statusFilter) {
    query = query.where('r.status', statusFilter)
  }

  // Apply created_at date filter if provided
  if (created_at?.start_date) {
    query = query.whereRaw('DATE(r.created_at) >= ?', [created_at.start_date.split('T')[0]])
  }
  if (created_at?.end_date) {
    query = query.whereRaw('DATE(r.created_at) <= ?', [created_at.end_date.split('T')[0]])
  }

  // Apply ordering by display_id desc
  query = query.orderBy('r.created_at', 'desc')

  // Apply pagination
  query = query.offset(skip as number).limit(take as number)

  // Execute query
  const returns = await query

  // Get total count for pagination (using distinct to avoid duplicates from joins)
  let countSubquery = knex('return as r')
    .distinct('r.id')
    .select('r.id')
    .join('order as o', 'r.order_id', 'o.id')
    .leftJoin('customer as c', 'c.id', 'o.customer_id')
    .join('return_item as ri', 'ri.return_id', 'r.id')
    .join('order_line_item as oli', 'ri.item_id', 'oli.id')
    .join('order_extra_detail as oe', 'oe.order_id', 'r.order_id')
    .whereNull('r.deleted_at')
    .whereNull('o.deleted_at')

  if (searchQuery) {
    const searchPattern = `${searchQuery}`
    if(req.query?.phone) {
      countSubquery = countSubquery.where('c.phone', searchPattern)
    } else{
      countSubquery = countSubquery.where('oe.marketplace_order_id', searchPattern)
    }
  }

  if (statusFilter) {
    countSubquery = countSubquery.where('r.status', statusFilter)
  }

  // Apply created_at date filter to count subquery if provided
  if (created_at?.start_date) {
    countSubquery = countSubquery.whereRaw('DATE(r.created_at) >= ?', [created_at.start_date.split('T')[0]])
  }
  if (created_at?.end_date) {
    countSubquery = countSubquery.whereRaw('DATE(r.created_at) <= ?', [created_at.end_date.split('T')[0]])
  }

  const countResult = await knex.count('* as count').from(countSubquery.as('subquery')).first()
  const totalCount = parseInt(String(countResult?.count || 0))

  // Transform image URLs to include CDN domain for v2 images
  logger.debug(`[RETURNS V2] Processing ${returns.length} returns for CDN transformation`)

  for(const r of returns){
    logger.debug(`[RETURNS V2] Return ${r.id}: thumbnail="${r.thumbnail}", oli_thumbnail="${r.oli_thumbnail}", metadata: ${r.metadata ? 'exists' : 'null'}`)

    // Transform thumbnail to full CDN URL if it exists (prefer return thumbnail, fallback to oli_thumbnail)
    const thumbnailToTransform = r.thumbnail || r.oli_thumbnail
    if (thumbnailToTransform && typeof thumbnailToTransform === 'string') {
      const originalThumbnail = thumbnailToTransform
      const extractedPath = extractRelativePath(thumbnailToTransform)
      const transformedThumbnail = constructS3Url(extractedPath)
      r.thumbnail = transformedThumbnail
      logger.debug(`[RETURNS V2] Transformed thumbnail: "${originalThumbnail}" -> "${transformedThumbnail}"`)
    } else {
      logger.debug(`[RETURNS V2] No thumbnail to transform for return ${r.id}`)
    }

    // Transform any image URLs in metadata if they exist
    if (r.metadata?.images && Array.isArray(r.metadata.images)) {
      const originalImages = [...r.metadata.images]
      r.metadata.images = r.metadata.images.map((imageUrl: string) =>
        constructS3Url(extractRelativePath(imageUrl))
      )
      logger.debug(`[RETURNS V2] Transformed metadata images: ${JSON.stringify({ original: originalImages, transformed: r.metadata.images })}`)
    }
  }

  res.json({
    returns,
    count: totalCount,
    offset: skip as number,
    limit: take as number,
  })
}