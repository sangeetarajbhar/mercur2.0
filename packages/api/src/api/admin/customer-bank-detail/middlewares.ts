import { MiddlewareRoute, validateAndTransformQuery } from "@medusajs/framework"
import { customerBankDetailQueryConfig } from "./query-config"
import { CustomerBankDetailParams, CustomerBankDetailRetrieveParams } from "./validator"

export const adminCustomerBankDetailMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/customer-bank-detail",
    middlewares: [
      validateAndTransformQuery(CustomerBankDetailParams, customerBankDetailQueryConfig.list),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/admin/customer-bank-detail/:id",
    middlewares: [
      validateAndTransformQuery(
        CustomerBankDetailRetrieveParams,
        customerBankDetailQueryConfig.retrieve
      ),
    ],
  },
]
