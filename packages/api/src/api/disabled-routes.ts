import {
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction
} from "@medusajs/framework/http"
import { MiddlewareRoute } from '@medusajs/framework'

const middlewares =  [
        async (req:MedusaRequest, res:MedusaResponse, next:MedusaNextFunction) => {
          // Respond with 404 or 403 to "close" the endpoint
          return res.status(404).json({ error: "This endpoint has been disabled" })
        }
      ]

export const disabledStoreRoutes: MiddlewareRoute[] = [
   {
      matcher: "/store/customers/me",
      method: ["POST"],
      middlewares
    },
    {
      matcher: "/store/carts/:id",
      method: ["GET","POST"],
      middlewares
    },
    {
      matcher: "/store/products/:id",
      method: ["GET"],
      middlewares
    }
]