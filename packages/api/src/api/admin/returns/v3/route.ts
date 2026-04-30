import ReturnRefundTypeLinkModuleService from '../../../../modules/return-refund-type-link/service';
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils';
import { CUSTOMER_BANK_MODULE } from "../../../../modules/customer-bank-detail";
import CustomerBankModuleService from "../../../../modules/customer-bank-detail/service";
import { CUSTOMER_UPI_MODULE } from "../../../../modules/customer-upi-detail";
import CustomerUpiModuleService from "../../../../modules/customer-upi-detail/service";
import { ORDER_LINE_ITEM_EXTENSION_MODULE } from '../../../../modules/order-line-item-extension';
import OrderLineItemExtensionModuleService from '../../../../modules/order-line-item-extension/service';
import { BankAccountType } from "../../../../utils/constants/bank_account_verification";
import { OrderLineItemStatus } from '../../../../utils/constants/order-statuses';
import { COD_PAYMENT_PROVIDER } from "../../../../utils/constants/payments";
import { adminCreateReturnOrderWorkflow } from '../../../../workflows/returns/workflows/admin-create-return-order'
import { AdminPostReturnsV3ReqSchemaType } from './validators';
import { RETURN_REFUND_TYPE_LINK_MODULE } from '../../../../modules/return-refund-type-link'
import { ReturnRefundTypeLinkStatus } from "../../../../utils/constants/return_refund_type_link";
import { getOrderReturnLocationIds } from '../../../utils/get-order-return-location-ids'

/**
 * @oas [post] /admin/returns/v3
 * operationId: "AdminCreateReturnv3"
 * summary: "Create a Return (Admin v3)"
 * description: "Creates a new return for a specific order line item using orderId and orderLineItemId."
 * x-authenticated: true
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminCreateReturnv3"
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
  req: AuthenticatedMedusaRequest<AdminPostReturnsV3ReqSchemaType>,
  res: MedusaResponse
) => {
  const { orderId, orderLineItemId, reason_id, note, receive_now, type, type_id } =
    req.validatedBody as AdminPostReturnsV3ReqSchemaType

  // Verify that the authenticated customer matches the order's customer
  const authenticatedCustomerId = req.auth_context?.actor_id

  if (!authenticatedCustomerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      'Authentication required to create a return'
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const eventBus = req.scope.resolve('event_bus')

  // Get shipping_methods with detail objects and verify order exists
  const { data: [order] } = await query.graph({
    entity: 'order',
    fields: [
      'id',
      'customer_id',
      'shipping_methods.*',
      'payment_collections.payment_sessions.provider_id'
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

  const providerId = order?.payment_collections?.[0]?.payment_sessions?.[0]?.provider_id
  const isCodOrder = providerId === COD_PAYMENT_PROVIDER

  let isUpi = false
  let isBank = false

  if (isCodOrder) {
    if (!type || !type_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'type and type_id are required for COD return requests'
      )
    }

    const customerUpiDetailService =
      req.scope.resolve<CustomerUpiModuleService>(CUSTOMER_UPI_MODULE)

    const customerBankDetailService =
      req.scope.resolve<CustomerBankModuleService>(CUSTOMER_BANK_MODULE)

    isUpi = type === BankAccountType.UPI
    isBank = type === BankAccountType.BANK

    if (!isUpi && !isBank) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Invalid account type'
      )
    }

    if (isUpi) {
      const existingDetails =
        await customerUpiDetailService.retrieveCustomerUpiDetail(type_id)

      if (!existingDetails) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          'Customer Refund method not found'
        )
      }
    }

    if (isBank) {
      const existingDetails =
        await customerBankDetailService.retrieveCustomerBankDetail(type_id)

      if (!existingDetails) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          'Customer Refund method not found'
        )
      }
    }
  }

  // Find shipping_method where detail.return_id is null
  const shippingMethod = order.shipping_methods?.find((method: { detail?: { return_id?: string | null } }) =>
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

    const { result } = await workflow.run({
      input: {
        orderId,
        orderLineItemId,
        reason_id,
        note: note ?? '',
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

      // Map return_id with upi/bank id only for COD orders.
      if (isCodOrder && type_id) {
        const returnRefundTypeLinkService =
          req.scope.resolve<ReturnRefundTypeLinkModuleService>(RETURN_REFUND_TYPE_LINK_MODULE)

        const bankType = isUpi ? BankAccountType.UPI : BankAccountType.BANK

        const createReturnRefundTypeLinkInput = {
          return_id: result.id,
          type: bankType,
          type_id: type_id,
          customer_id: order.customer_id,
          status: ReturnRefundTypeLinkStatus.ACTIVE,
          metadata: null,
          created_by: authenticatedCustomerId
        }

        await returnRefundTypeLinkService.createReturnRefundTypeLinks(createReturnRefundTypeLinkInput)
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
    console.log('Error creating admin return: ', error)

    if (error instanceof MedusaError) {
      throw error
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Failed to create return: ${error.message}`
    )
  }
}
