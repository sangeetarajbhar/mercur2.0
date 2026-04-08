import { MiddlewareRoute, validateAndTransformQuery } from "@medusajs/framework"
import { customerBankAccountVerificationQueryConfig } from "./query-config"
import { CustomerBankAccountVerificationParams } from "./validator"

export const adminCustomerBankAccountVerificationMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/customer-bank-account-verification",
    middlewares: [
      validateAndTransformQuery(
        CustomerBankAccountVerificationParams,
        customerBankAccountVerificationQueryConfig.list
      ),
    ],
  },
]
