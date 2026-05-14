import multer from "multer"
import type { MiddlewareRoute } from "@medusajs/framework/http"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})

const handleUpload = upload.single("file")

export const sellerUploadMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/sellers/uploads",
    bodyParser: { sizeLimit: "10mb" },
    middlewares: [
      (req: any, res: any, next: any) => {
        if (req.headers["content-type"]?.includes("multipart/form-data")) {
          handleUpload(req, res, next)
        } else {
          next()
        }
      },
    ],
  },
]

