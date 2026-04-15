import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { createCustomerAddressesWorkflow, updateCustomersWorkflow } from "@medusajs/medusa/core-flows"
import {
  StoreCreateCustomerAddressType,
  StoreGetCustomerAddressesParamsType,
} from "../../validators"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
  MedusaError,
} from "@medusajs/framework/utils"
import { refetchCustomer } from "../../helpers"
import { HttpTypes } from "@medusajs/framework/types"
import { defaultStoreCustomerAddressFields } from "./query-config"

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetCustomerAddressesParamsType>,
  res: MedusaResponse<HttpTypes.StoreCustomerAddressListResponse>
) => {
  const customerId = req.auth_context.actor_id

  let fields = defaultStoreCustomerAddressFields;
  if (req.query.fields && req.query.fields.length) {
    fields = req.queryConfig.fields;
  }

  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "customer_address",
    variables: {
      filters: { ...req.filterableFields, customer_id: customerId },
      ...req.queryConfig.pagination,
    },
    fields: fields,
  })

  const { rows: addresses, metadata } = await remoteQuery(queryObject)

  // append landmark in address_2 field
  // const normalizedAddresses = addresses.map((address) => {
  //   const landmark =
  //     address.metadata?.landmark ?? null
  //
  //   if (!landmark) {
  //     return address
  //   }
  //
  //   return {
  //     ...address,
  //     address_2: address.address_2
  //       ? `${address.address_2}, ${landmark}`.trim()
  //       : landmark.trim(),
  //   }
  // })

  res.json({
    addresses,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateCustomerAddressType>,
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

  if (!customerData.first_name && !customerData.last_name) {
    const first_name = req.validatedBody.first_name
    const last_name = req.validatedBody.last_name

    await updateCustomersWorkflow(req.scope).run({
      input: {
        selector: { id: customerId },
        update: {
          first_name: first_name,
          last_name: last_name,
        },
      },
    })
  }

  const createAddresses = createCustomerAddressesWorkflow(req.scope)
  const addresses = [
    {
      ...req.validatedBody,
      customer_id: customerId,
    },
  ]

  await createAddresses.run({
    input: { addresses },
  })

  const customer = await refetchCustomer(
    customerId,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ customer })
}
