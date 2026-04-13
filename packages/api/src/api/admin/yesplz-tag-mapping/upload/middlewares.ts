import multer from 'multer'
import { MiddlewareRoute } from '@medusajs/framework'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

export const yesplzTagMappingUploadMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/admin/yesplz-tag-mapping/upload',
    bodyParser: false,
    middlewares: [
      upload.single('file')
    ]
  }
]

