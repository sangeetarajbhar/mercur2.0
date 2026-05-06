import { defineMiddlewares } from "@medusajs/medusa"

import { adminMiddlewares } from "./admin/middlewares"
import { authMiddlewares } from "./auth/middlewares"
import { storeMiddlewares } from "./store/middlewares"
import { vendorMiddlewares } from "./vendor/middlewares"
import { unlessBaseUrl } from "../shared/infra/http/utils"
import { checkSellerApproved, storeActiveGuard } from "../shared/infra/http/middlewares"
import { authenticate } from "@medusajs/framework"
import { hooksMiddlewares } from "./hooks/middleware"

export default defineMiddlewares({
  routes: [
    ...adminMiddlewares,
    ...vendorMiddlewares,
    ...storeMiddlewares,
    ...authMiddlewares,
    ...hooksMiddlewares,
  ],
})
