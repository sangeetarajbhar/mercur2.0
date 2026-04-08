import { MiddlewareRoute, validateAndTransformBody } from "@medusajs/framework"
import { PostAdminCreateImageSize, PostAdminCreateResizeConfig } from "./validators"

export const imageConfigurationMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/image-configuration/image-sizes",
    method: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminCreateImageSize)],
  },
  {
    matcher: "/admin/image-configuration/resize-configs",
    method: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminCreateResizeConfig)],
  },
]
