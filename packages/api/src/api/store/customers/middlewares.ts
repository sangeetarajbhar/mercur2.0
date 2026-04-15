// import * as QueryConfig from "./query-config"

import {
  StoreGetCustomerParams,
  StoreUpdateCustomer,
  StoreUpdateCustomerAddress,
  StoreCreateCustomerAddress,
} from "./validators"

import { MiddlewareRoute } from "@medusajs/framework/http"
// import { authenticate } from "../../../utils/middlewares/authenticate-middleware"
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import { z } from "zod"

const defaultStoreCustomersFields = [
  "id",
  "email",
  "company_name",
  "first_name",
  "last_name",
  "phone",
  "metadata",
  "has_account",
  "deleted_at",
  "created_at",
  "updated_at",
  "*addresses",
]

export const retrieveTransformQueryConfig = {
  defaults: defaultStoreCustomersFields,
  allowed: [
    ...defaultStoreCustomersFields.map((f) => f.replace("*", "")),
    "orders",
  ],
  isList: false,
}

const NextTierQuerySchema = z.object({
  region_id: z.string(),
})

export const storeCustomerV2RoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/customers/me/v2",
    middlewares: [
      validateAndTransformBody(StoreUpdateCustomer),
      validateAndTransformQuery(
        StoreGetCustomerParams,
        retrieveTransformQueryConfig
      ),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/store/customers/me/addresses",
    middlewares: [
      validateAndTransformBody(StoreCreateCustomerAddress),
      validateAndTransformQuery(
        StoreGetCustomerParams,
        retrieveTransformQueryConfig
      ),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/store/customers/me/addresses/:address_id",
    middlewares: [
      validateAndTransformBody(StoreUpdateCustomerAddress),
      validateAndTransformQuery(
        StoreGetCustomerParams,
        retrieveTransformQueryConfig
      ),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/customers/me/next-tier",
    middlewares: [
      validateAndTransformQuery(NextTierQuerySchema, {
        isList: false,
      }),
    ],
  },
]
