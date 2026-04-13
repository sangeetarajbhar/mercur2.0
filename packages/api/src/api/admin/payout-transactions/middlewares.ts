import { MiddlewareRoute, validateAndTransformQuery } from "@medusajs/framework"
import { payoutTransactionsQueryConfig } from "./query-config"
import { PayoutTransactionsParams } from "./validator"

export const adminPayoutTransactionsMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/admin/payout-transactions",
    middlewares: [validateAndTransformQuery(PayoutTransactionsParams, payoutTransactionsQueryConfig.list)],
  },
]
