import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import {
  StoreGetCustomerParamsType,
  StoreUpdateCustomerType,
} from "../../validators"
import { refetchCustomer } from "../../helpers"
// import { MedusaError } from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import { addCustomerDetailsWorkflow } from '../../../../../workflows/customer-details/customer-details'
import { MedusaError } from "@medusajs/framework/utils"


export const POST = async (
  req: AuthenticatedMedusaRequest<StoreUpdateCustomerType>,
  res: MedusaResponse<HttpTypes.StoreCustomerResponse>
) => {
  const customerId = req.auth_context.actor_id

  const customerData = await refetchCustomer(
    customerId,
    req.scope,
    req.queryConfig.fields
  )

  if (!customerData) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "User not found")
  }

  const first_name = req.validatedBody.first_name
  const last_name = req.validatedBody.last_name

  // Sanitize the relevant fields
  const updatePayload = {
    ...req.validatedBody,
    first_name: first_name,
    last_name: last_name,
  }

  await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customerId },
      update: updatePayload,
    },
  })

  await addCustomerDetailsWorkflow(req.scope).run({
    input: {
      customerId: customerId,
      dob: req.validatedBody.dob as string,
      gender: req.validatedBody.gender as 'M' | 'F' | null | "",
    }
  })

  const customer = await refetchCustomer(
    customerId,
    req.scope,
    req.queryConfig.fields
  )
  res.status(200).json({ customer })
}


export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetCustomerParamsType>,
  res: MedusaResponse<HttpTypes.StoreCustomerResponse>
) => {
  const id = req.auth_context.actor_id
  const customer = await refetchCustomer(id, req.scope, ['*', 'addresses.*', 'groups.*'])

  if (!customer) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Customer with id: ${id} was not found`
    )
  }

  if (customer.email) {
    if (customer?.email?.toLowerCase() === customer?.phone?.toLowerCase() + "@gmail.com") {

      delete customer.email
    }
  }
  res.json({ customer })
}
