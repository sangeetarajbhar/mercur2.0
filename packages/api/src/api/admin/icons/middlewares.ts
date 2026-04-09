import multer from "multer"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const validMimeTypes = ["image/png", "image/svg+xml"]
    const validExtensions = [".png", "svg"]

    const hasValidMimeType = validMimeTypes.includes(file.mimetype)
    const hasValidExtension = validExtensions.some((ext) =>
      file.originalname.toLowerCase().endsWith(ext)
    )

    if (hasValidMimeType || hasValidExtension) {
      cb(null, true)
    } else {
      cb(new Error("INVALID_FILE_TYPE"))
    }
  },
})

const handleMulterErrors = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  upload.single("icon")(req as any, res as any, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(
            new MedusaError(
              MedusaError.Types.INVALID_DATA,
              "File size exceeds the maximum limit of 1MB"
            )
          )
        }
        return next(new MedusaError(MedusaError.Types.INVALID_DATA, err.message))
      }

      if (err.message === "INVALID_FILE_TYPE") {
        return next(
          new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Only PNG and SVG image files are allowed"
          )
        )
      }

      return next(
        new MedusaError(
          MedusaError.Types.INVALID_DATA,
          err.message || "File upload error"
        )
      )
    }

    next()
  })
}

export const iconsMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/icons",
    bodyParser: { sizeLimit: "1mb" },
    middlewares: [handleMulterErrors],
  },
]

