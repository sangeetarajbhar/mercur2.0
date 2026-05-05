import {MiddlewareRoute, validateAndTransformBody, validateAndTransformQuery} from '@medusajs/framework'

export const hooksMiddlewares: MiddlewareRoute[] = [
  {
    method: ['POST'],
    matcher: '/hooks/payouts',
    bodyParser: { preserveRawBody: true }
  },
  {
    method: ['POST'],
    matcher: '/hooks/enhanced-import/image-callback',
    bodyParser: {
      sizeLimit: '10mb', // Allow larger payloads for image processing results
      preserveRawBody: false // JSON parsing is fine for this endpoint
    }
  },
  {
    method: ['POST'],
    matcher: '/hooks/yesplz/tags',
    bodyParser: { 
      preserveRawBody: false, // JSON parsing is fine
      sizeLimit: '1mb' // Tags payload should be small
    }
  },
  
  // {
  //   method: ['POST'],
  //   matcher: '/hooks/payment/razorpay_razorpay',
  //   bodyParser: { preserveRawBody: true }
  // }
]
