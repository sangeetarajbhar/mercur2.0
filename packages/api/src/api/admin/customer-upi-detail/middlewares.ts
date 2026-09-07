import { MiddlewareRoute, validateAndTransformQuery } from "@medusajs/framework"
import { customerUpiDetailQueryConfig } from "./query-config"
import { CustomerUpiDetailParams, CustomerUpiDetailRetrieveParams } from "./validator"

export const adminCustomerUpiDetailMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/customer-upi-detail",
    middlewares: [validateAndTransformQuery(CustomerUpiDetailParams, customerUpiDetailQueryConfig.list)],
  },
  {
    methods: ["GET"],
    matcher: "/admin/customer-upi-detail/:id",
    middlewares: [
      validateAndTransformQuery(CustomerUpiDetailRetrieveParams, customerUpiDetailQueryConfig.retrieve),
    ],
  },
]
