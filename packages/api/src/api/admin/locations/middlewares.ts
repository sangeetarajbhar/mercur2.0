import { MiddlewareRoute } from "@medusajs/framework/http"
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import * as QueryConfig from "./query-config"
import {
  AdminGetStockLocationParams,
  AdminUpdateStockLocation,
} from "./validators"
import {CreateLocationSchemaTest} from "./validators";

export const stockLocationRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/locations",
    bodyParser: { sizeLimit: "20mb" }, // document pdf upload can be of 3mb each
    middlewares: [
      validateAndTransformBody(CreateLocationSchemaTest),
      validateAndTransformQuery(
        AdminGetStockLocationParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/locations/:id",
    bodyParser: { sizeLimit: "20mb" }, // document pdf upload can be of 3mb each
    middlewares: [
      validateAndTransformBody(AdminUpdateStockLocation),
      validateAndTransformQuery(
        AdminGetStockLocationParams,
        QueryConfig.retrieveTransformQueryConfig
      ),
    ],
  },
]
