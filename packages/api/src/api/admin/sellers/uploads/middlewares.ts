import multer from 'multer'
import { MiddlewareRoute } from '@medusajs/framework/http'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

// Middleware to handle both multipart and JSON requests
const handleUpload = upload.single('file')

export const sellerUploadMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/admin/sellers/uploads',
    bodyParser: { sizeLimit: '10mb' },
    middlewares: [
      // Handle multipart file upload (if file is present)
      // If no file, continue to route which will check for base64_content
      (req: any, res: any, next: any) => {
        // Only use multer if Content-Type is multipart
        if (req.headers['content-type']?.includes('multipart/form-data')) {
          handleUpload(req, res, next)
        } else {
          // For JSON requests, skip multer and continue
          next()
        }
      }
    ]
  }
]

