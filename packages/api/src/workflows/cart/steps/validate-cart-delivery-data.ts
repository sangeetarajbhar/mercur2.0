import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { MedusaContainer } from '@medusajs/framework'
import { validateExistingDeliveryData, validatePayloadDeliveryData, getCartAddressPincode } from './helpers/validate-delivery-data'
import { CART_DELIVERY_DETAIL_MODULE } from '../../../modules/cart-delivery-detail'
import CartDeliveryDetailService from '../../../modules/cart-delivery-detail/service'

type ValidateCartDeliveryDataInput = {
    cart_id: string
    cart: any
    input?: {
        shipping_address?: {
            postal_code?: string
        }
        additional_data?: {
            delivery_detail?: {
                delivery_type?: string
                slot_id?: string | null
            }
        }
    }
    requireDeliveryData?: boolean // If true, delivery data must exist (for order creation)
    clearInvalidDeliveryData?: boolean // If true, clear invalid existing delivery detail instead of throwing (used for update-cart)
}

type StepResult = {
    isValid: boolean
    error?: string
    cleared_delivery_detail?: boolean
}

/**
 * Step to validate cart delivery data before updating cart or creating order
 * 
 * This step validates:
 * 1. Existing delivery data in DB (if exists) - checks if still valid for current zone and time
 * 2. Delivery data in payload (if provided) - validates it's correct for cart address
 * 3. Home trial eligibility if delivery_type is 'home_trial'
 * 4. If no delivery data in payload and no delivery data in DB - allows update (unless requireDeliveryData is true)
 */
export const validateCartDeliveryDataStep = createStep(
    {
        name: 'validate-cart-delivery-data'
    },
    async (
        input: ValidateCartDeliveryDataInput,
        { container }
    ): Promise<StepResponse<StepResult, StepResult>> => {
        const {
            cart_id,
            cart,
            input: requestInput,
            requireDeliveryData = false,
            clearInvalidDeliveryData = false
        } = input
        const scope = container as MedusaContainer

        try {
            const query = scope.resolve(ContainerRegistrationKeys.QUERY) as any
            const cartDeliveryDetailService = scope.resolve<CartDeliveryDetailService>(CART_DELIVERY_DETAIL_MODULE) as any

            // Extract pincode from cart (from input or existing cart)
            const cartPincode = getCartAddressPincode(cart, requestInput)

            // If no pincode, we can't validate delivery data - this might be okay if just updating other fields
            // But if delivery data is provided or required, we need pincode
            const deliveryDetailInPayload = requestInput?.additional_data?.delivery_detail
            if ((deliveryDetailInPayload || requireDeliveryData) && !cartPincode) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    'Postal code is required for delivery validation'
                )
            }

            // Fetch existing delivery data from DB (only non-deleted records)
            const { data: existingDeliveryDetails } = await query.graph({
                entity: 'cart_delivery_detail',
                filters: { cart_id, deleted_at: { $eq: null } },
                fields: ['id', 'cart_id', 'delivery_type', 'delivery_date', 'start_time', 'end_time', 'slot_id']
            })

            const existingDeliveryDetail = existingDeliveryDetails && existingDeliveryDetails.length > 0
                ? existingDeliveryDetails[0]
                : null

            // If delivery data is required (for order creation) but doesn't exist, throw error
            if (requireDeliveryData && !existingDeliveryDetail) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    'Cart delivery detail not found. Cannot complete cart without delivery details.'
                )
            }

            // Scenario 1: Validate existing delivery data only when payload does NOT provide replacement delivery detail.
            // If payload delivery_detail is present, we validate only payload and let update flow overwrite existing data.
            if (existingDeliveryDetail && cartPincode && !deliveryDetailInPayload) {
                const cartItems = cart?.items || null

                const validationResult = await validateExistingDeliveryData(
                    existingDeliveryDetail as any,
                    cartPincode,
                    scope,
                    cartItems
                )

                if (!validationResult.isValid) {
                    // For update-cart: allow the cart update to proceed by clearing stale/invalid delivery data
                    // when request did not provide new delivery data and delivery isn't required.
                    if (
                        clearInvalidDeliveryData &&
                        !requireDeliveryData &&
                        !deliveryDetailInPayload
                    ) {

                        await cartDeliveryDetailService.updateCartDeliveryDetails({
                            id: existingDeliveryDetail.id,
                            deleted_at: new Date(),
                            updated_at: new Date()
                        })

                        return new StepResponse({
                            isValid: true,
                            cleared_delivery_detail: true
                        })
                    }

                    throw new MedusaError(
                        MedusaError.Types.INVALID_DATA,
                        validationResult.error || 'Delivery data is no longer valid'
                    )
                }
            }

            // Scenario 2: If delivery data in payload, validate it
            if (deliveryDetailInPayload && cartPincode) {
                const cartItems = cart?.items || null

                const validationResult = await validatePayloadDeliveryData(
                    {
                        delivery_type: deliveryDetailInPayload.delivery_type || 'standard',
                        slot_id: deliveryDetailInPayload.slot_id
                    },
                    cartPincode,
                    scope,
                    cart_id,
                    cartItems
                )

                if (!validationResult.isValid) {
                    throw new MedusaError(
                        MedusaError.Types.INVALID_DATA,
                        validationResult.error || 'Invalid delivery data for the provided address'
                    )
                }
            }

            return new StepResponse({
                isValid: true
            })
        } catch (error) {
            // Re-throw MedusaError to propagate to API
            if (error instanceof MedusaError) {
                throw error
            }

            // Wrap other errors
            console.error('Error validating cart delivery data:', error)
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                error instanceof Error ? error.message : 'Failed to validate cart delivery data'
            )
        }
    }
)

