import { MiddlewareRoute } from "@medusajs/framework/http"
import { validateAndTransformQuery } from "@medusajs/framework"
import * as queryConfig from "./query-config"
import { StoreGetPaymentProvidersParams } from "./validators"

export const storePaymentProvidersMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/custom/payment-providers",
    bodyParser: false,
    middlewares: [
      validateAndTransformQuery(
        StoreGetPaymentProvidersParams,
        queryConfig.listTransformPaymentProvidersQueryConfig
      ),
    ],
  },
]
