import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

export type GetCustomerContactStepInput = {
  customerId: string
}

export type GetCustomerContactStepOutput = {
  contact: {
    phone: string
    name: string
    email: string
  }
  customerName: string
}

export const getCustomerContactStep = createStep(
  "get-customer-contact-for-cod",
  async (input: GetCustomerContactStepInput, { container }) => {
    const customerModule = container.resolve(Modules.CUSTOMER)
    const customer = await customerModule.retrieveCustomer(input.customerId)

    const customerName = [customer.first_name, customer?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim()

    const contact = {
      phone: customer.phone || "",
      name: customerName,
      email: customer?.email || "",
    }

    return new StepResponse({
      contact,
      customerName,
    })
  }
)

