import { validateAndTransformQuery } from "@medusajs/framework"
import { MiddlewareRoute } from "@medusajs/medusa"

import { storeAttributeQueryConfig } from "./route"
import { StoreGetAttributesParams } from "./validators"

export const storeAttributesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/store/attributes",
    middlewares: [
      validateAndTransformQuery(
        StoreGetAttributesParams,
        storeAttributeQueryConfig.list
      ),
    ],
  },
]
