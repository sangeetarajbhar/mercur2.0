import multer from "multer"
import { MiddlewareRoute } from "@medusajs/framework"

const upload = multer({ storage: multer.memoryStorage() })

export const vendorPriceListImportMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/vendor/price-list/import",
    middlewares: [upload.single("file")],
  },
]
