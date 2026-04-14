import { MiddlewareRoute, authenticate } from "@medusajs/framework"

export const storeV2ProductListMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/v2/productlist",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
    ],
  },
]

