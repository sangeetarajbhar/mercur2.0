import type { MiddlewareRoute } from "@medusajs/medusa"

import { rewriteProductQuerySellerToSellersFieldsIfProductPath } from "./utils/middlewares/products/rewrite-query-seller-to-sellers-fields"

const mw = [rewriteProductQuerySellerToSellersFieldsIfProductPath]

/**
 * Wildcard matchers (e.g. `/admin*`) + pathname guard. No `method` property so Medusa treats
 * these as **global** middleware — they run before core **route** middleware that reads `fields`.
 *
 * @see https://docs.medusajs.com/learn/fundamentals/api-routes/middlewares
 */
export const productQuerySellerRewriteRoutes: MiddlewareRoute[] = [
  { matcher: "/admin*", middlewares: mw },
  { matcher: "/vendor*", middlewares: mw },
  { matcher: "/store*", middlewares: mw },
]
