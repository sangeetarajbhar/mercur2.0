import multer from 'multer'
import { MiddlewareRoute } from '@medusajs/framework/http'
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from '@medusajs/framework/http'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/excel',
      'application/x-excel',
      'text/csv',
      'application/csv'
    ]

    const hasValidMimeType = validMimeTypes.includes(file.mimetype)
    const hasValidExtension = validExtensions.some(ext =>
      file.originalname.toLowerCase().endsWith(ext)
    )

    if (hasValidMimeType || hasValidExtension) {
      cb(null, true)
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) or CSV (.csv) files are allowed'))
    }
  }
})

/** Wrapper so multer receives the same req/res as the route handler (fixes req.file not set with bodyParser) */
const handleUpload = (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
  const contentType = req.headers['content-type'] || ''
  if (!contentType.includes('multipart/form-data')) {
    return next()
  }
  upload.single('file')(req as any, res as any, (err: any) => {
    if (err) {
      return next(err)
    }
    next()
  })
}

export const yesplzProductScoresMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/admin/yesplz/product-scores',
    bodyParser: false,
    middlewares: [handleUpload]
  }
]

