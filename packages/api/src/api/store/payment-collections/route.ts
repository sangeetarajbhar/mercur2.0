import { createPaymentCollectionForCartWorkflowId } from "../../../workflows/cart/steps/create-payment-collection-for-cart";
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { HttpTypes } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils";
import { refreshCartItemsWorkflow } from '../../../workflows/cart/workflows/refresh-cart-items'
import { Modules } from "@medusajs/utils";
import { validateCart, getCompletedCartErrorResponse, getCustomCartErrorResponse, CustomErrorResponse } from '../carts/utils/validate-cart'
import { refreshCartItemsWorkflowFieldsForPaymentCollectionAndSession } from './query-config'
import { CartErrorStatusName } from '../../../utils/constants/error_status_code'

interface ShippingAddress {
  id: string
  customer_id: string | null
  first_name: string
  last_name: string | null
  company: string | null
  address_1: string
  address_2: string
  city: string
  country_code: string | null
  province: string | null
  postal_code: string
  phone: string
  metadata: any | null
  created_at: Date
  updated_at: Date
}

export interface RefreshCartItemsWorkflowResult {
  id: string
  total: number
  subtotal: number
  shipping_total: number
  tax_total: number
  discount_total: number
  extra_charges?: string[]
  extra_charge_total?: number
  delivery_details?: object | null
  customer_id: string | null
  items?: string[]
  shipping_address: ShippingAddress
}

export const POST = async (
  req: AuthenticatedMedusaRequest<HttpTypes.StoreCreatePaymentCollection>,
  res: MedusaResponse<HttpTypes.StorePaymentCollectionResponse | CustomErrorResponse>
) => {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const { cart_id } = req.body

  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    const message = `Unauthorized request., Please login again.`
    const response = getCustomCartErrorResponse({
      cartId: cart_id,
      status: CartErrorStatusName.UNAUTHORIZED_USER,
      message: message
    })
    return res.status(401).json(response)
  }

  const { cartData, isCompleted } = await validateCart(cart_id, req.scope)
  if (isCompleted) {
    return res.status(400).json(getCompletedCartErrorResponse(cartData?.id) as any)
  }
  // refreshCartItemsWorkflow is called to get updated totals (including extra charges)
  const refreshCartWorkflow = refreshCartItemsWorkflow(req.scope)
  const { result } = await refreshCartWorkflow.run({
    input: {
      cart_id: cart_id,
      force_refresh: true,
      fields: refreshCartItemsWorkflowFieldsForPaymentCollectionAndSession
    },
  })

  if (!result) {
    console.error(`---Cart Id: ${cart_id}, Something went wrong while generating payment collection, refreshCartWorkflow error--- `)
    console.dir(result, { depth: null, colors: true })

    const message = `Something went wrong while generating the payment. Please try again.`
    const response = getCustomCartErrorResponse({
      cartId: cart_id,
      status: CartErrorStatusName.CART_REFRESH_FAILED,
      message: message
    })
    return res.status(400).json(response)
  }

  const refreshCartResult = result as RefreshCartItemsWorkflowResult

  if (!refreshCartResult.customer_id) {
    console.error(`---Cart Id: ${cart_id}, customer_id issue, on payment collection---`)
    console.dir(refreshCartResult, { depth: null, colors: true })

    const message = `Your cart is not linked to your account. Please log in again.`
    const response = getCustomCartErrorResponse({
      cartId: cart_id,
      status: CartErrorStatusName.CART_NOT_LINKED_TO_CUSTOMER,
      message: message
    })
    return res.status(400).json(response)
  }

  if (refreshCartResult.customer_id !== customerId) {
    console.error(`---Cart Id: ${cart_id}, customer doest not match, on payment collection---`)
    console.dir(refreshCartResult, { depth: null, colors: true })

    const message = `This cart isn’t linked to your account. Please log in with the correct account.`
    const response = getCustomCartErrorResponse({
      cartId: cart_id,
      status: CartErrorStatusName.FORBIDDEN_USER,
      message: message
    })
    return res.status(403).json(response)
  }

  if (!refreshCartResult.delivery_details) {
    console.error(`---Cart Id: ${cart_id}, Cart delivery details not found on payment collection---`)
    console.dir(refreshCartResult, { depth: null, colors: true })

    const message = `Please select a Delivery type or Delivery time before generating payment.`
    const response = getCustomCartErrorResponse({
      cartId: cart_id,
      status: CartErrorStatusName.DELIVERY_DETAILS_MISSING,
      message: message
    })
    return res.status(400).json(response)
  }

  const shipping_address = refreshCartResult.shipping_address
  if (!shipping_address) {
    console.error(`---Cart Id: ${cart_id}, Cart Shipping address missing - found on payment collection---`)
    console.dir(refreshCartResult, { depth: null, colors: true })

    const message = `Shipping address is not selected. Please add a shipping address.`
    const response = getCustomCartErrorResponse({
      cartId: cart_id,
      status: CartErrorStatusName.SHIPPING_ADDRESS_MISSING,
      message: message
    })
    return res.status(400).json(response)
  }

  const isInvalidString = (value?: string | null): boolean => {
    return (
      value === null ||
      value === undefined ||
      value.trim().length === 0
    )
  }

  const requiredFields = {
    first_name: shipping_address.first_name,
    address_1: shipping_address.address_1,
    address_2: shipping_address.address_2,
    city: shipping_address.city,
    postal_code: shipping_address.postal_code,
    phone: shipping_address.phone,
  }

  const missingFields = Object.entries(requiredFields)
    .filter(([_, value]) => isInvalidString(value))
    .map(([key]) => key)

  if (missingFields.length > 0) {
    console.error(`---Cart Id: ${cart_id}, Invalid shipping address fields detected, on payment collection---`)
    console.dir(refreshCartResult, { depth: null, colors: true })
    console.error('Missing / invalid fields:', missingFields)

    const message = `Shipping address is incomplete. Please add the required details.`
    const response = getCustomCartErrorResponse({
      cartId: cart_id,
      status: CartErrorStatusName.SHIPPING_ADDRESS_INCOMPLETE,
      message: message
    })
    return res.status(400).json(response)
  }

  // Step 2: Check if payment collection already exists
  const [cartCollectionRelation] = await remoteQuery(
    remoteQueryObjectFromString({
      entryPoint: "cart_payment_collection",
      variables: { filters: { cart_id } },
      fields: req.queryConfig.fields.map((f) => `payment_collection.${f}`),
    })
  )

  let paymentCollection = cartCollectionRelation?.payment_collection

  if (!paymentCollection) {
    const we = req.scope.resolve(Modules.WORKFLOW_ENGINE)
    await we.run(createPaymentCollectionForCartWorkflowId, {
      input: req.body,
      transactionId: "create-payment-collection-for-cart-" + cart_id,
    })

    // Fetch the newly created payment collection
    const [newCartCollectionRelation] = await remoteQuery(
      remoteQueryObjectFromString({
        entryPoint: "cart_payment_collection",
        variables: { filters: { cart_id } },
        fields: req.queryConfig.fields.map((f) => `payment_collection.${f}`),
      })
    )
    paymentCollection = newCartCollectionRelation?.payment_collection
  }

  res.status(200).json({ payment_collection: paymentCollection })
}
