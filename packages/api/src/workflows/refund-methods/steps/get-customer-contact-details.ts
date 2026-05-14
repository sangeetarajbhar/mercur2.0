import { MedusaError, Modules } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

/**
 * Step to get customer contact details for Razorpay validation
 */
export const getCustomerContactDetailsStep = createStep(
  'get-customer-contact-details',
  async ({ customerId }: { customerId: string }, { container }) => {
    if (!customerId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Customer ID is required`
      )
    }

    try {
      const customerModuleService = container.resolve(Modules.CUSTOMER)
      const customer = await customerModuleService.retrieveCustomer(customerId)

      const firstName = customer.first_name?.trim() || ""
      const lastName = customer.last_name?.trim()

      const name = lastName ? `${firstName} ${lastName}` : firstName

      const email = customer.email ? customer.email.trim() : ''
      const phone = customer.phone

      if (!phone) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Customer phone number is required for account validation`
        )
      }

      const contactDetails = {
        name: name,
        email: email,
        contact: phone,
        type: 'customer',
        // reference_id: customerId,
        notes: {
          medusa_customer_id: customerId
        }
      }

      return new StepResponse(contactDetails)
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Customer not found: ${customerId}`
        )
      }

      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to retrieve customer contact details: ${error.message || 'Unknown error'}`
      )
    }
  }
)
