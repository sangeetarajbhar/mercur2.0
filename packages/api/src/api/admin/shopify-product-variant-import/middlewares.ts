import multer from "multer"
import type { MiddlewareRoute } from "@medusajs/medusa"

// Use in-memory storage; CSV sizes are typically moderate and we process immediately.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Allow up to 100MB CSV files for Shopify variant mappings
    fileSize: 100 * 1024 * 1024,
  },
})

export const shopifyProductVariantImportMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/shopify-product-variant-import",
    // Attach Multer so `req.file` is populated in the route handler
    // Field name must be `file` in the multipart/form-data payload
    // @ts-ignore – Multer middleware signature is compatible with Express
    middlewares: [upload.single("file")],
  },
]

