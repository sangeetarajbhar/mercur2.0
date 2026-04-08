import { defineMiddlewares } from "@medusajs/medusa"

import { adminMiddlewares } from "./admin/middlewares"
import { authMiddlewares } from "./auth/middlewares"
import { storeMiddlewares } from "./store/middlewares"
import { vendorMiddlewares } from "./vendor/middlewares"

export default defineMiddlewares({
  routes: [
    ...adminMiddlewares,
    ...vendorMiddlewares,
    ...storeMiddlewares,
    ...authMiddlewares,
  ],
})
