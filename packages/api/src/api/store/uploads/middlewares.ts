import { validateAndTransformBody } from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/framework/http";
import { StoreUploadFileSchema } from "./validators";

export const storeUploadsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/store/uploads",
    bodyParser: { sizeLimit: "10mb" },
    middlewares: [
      validateAndTransformBody(StoreUploadFileSchema),
    ],
  },
];
