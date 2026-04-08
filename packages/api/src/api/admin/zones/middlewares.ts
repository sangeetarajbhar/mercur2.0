import { MiddlewareRoute } from "@medusajs/framework/http"
import {
  validateAndTransformQuery,
  validateAndTransformBody,
} from "@medusajs/framework"
import { AdminGetZonesParams, AdminCreateZone, AdminUpdateZone } from "./validators"
import { UpdateSlotDefinitionSchema, CreateInstantPromiseSchema, UpdateInstantPromiseSchema } from "./validators"
import { CreateSlotOverrideSchema, UpdateSlotOverrideSchema } from "./validation/slot-override-validation"
import { validateUniquePostcodesMiddleware, validateSlotDefinitionMiddleware } from "./validation/zone-validation"

export const zonesRoutesMiddlewares: MiddlewareRoute[] = [
  {
    method: ["GET"],
    matcher: "/admin/zones",
    middlewares: [
      validateAndTransformQuery(AdminGetZonesParams, {
        defaults: ["limit", "offset", "q"],
        isList: true,
      }),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/zones",
    middlewares: [validateAndTransformBody(AdminCreateZone), validateUniquePostcodesMiddleware],
  },
  {
    method: ["GET"],
    matcher: "/admin/zones/:id",
    middlewares: [],
  },
  {
    method: ["POST"],
    matcher: "/admin/zones/:id",
    middlewares: [validateAndTransformBody(AdminUpdateZone), validateUniquePostcodesMiddleware],
  },
  {
    method: ["GET"],
    matcher: "/admin/zones/:id/slot-definitions",
    middlewares: [],
  },
  {
    method: ["POST"],
    matcher: "/admin/zones/:id/slot-definitions",
    middlewares: [validateSlotDefinitionMiddleware],
  },
  {
    method: ["POST"],
    matcher: "/admin/zones/:id/slot-definitions/:slotId",
    middlewares: [validateAndTransformBody(UpdateSlotDefinitionSchema)],
  },
  {
    method: ["GET"],
    matcher: "/admin/zones/:id/instant-promises",
    middlewares: [],
  },
  {
    method: ["POST"],
    matcher: "/admin/zones/:id/instant-promises",
    middlewares: [validateAndTransformBody(CreateInstantPromiseSchema)],
  },
  {
    method: ["POST"],
    matcher: "/admin/zones/:id/instant-promises/:promiseId",
    middlewares: [validateAndTransformBody(UpdateInstantPromiseSchema)],
  },
  {
    method: ["GET"],
    matcher: "/admin/zones/:id/slot-overrides",
    middlewares: [],
  },
  {
    method: ["POST"],
    matcher: "/admin/zones/:id/slot-overrides",
    middlewares: [validateAndTransformBody(CreateSlotOverrideSchema)],
  },
  {
    method: ["GET"],
    matcher: "/admin/zones/:id/slot-overrides/:overrideId",
    middlewares: [],
  },
  {
    method: ["POST"],
    matcher: "/admin/zones/:id/slot-overrides/:overrideId",
    middlewares: [validateAndTransformBody(UpdateSlotOverrideSchema)],
  },
]
