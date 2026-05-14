import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

function requestPathname(req: MedusaRequest): string {
  const r = req as MedusaRequest & {
    baseUrl?: string
    path?: string
    originalUrl?: string
    url?: string
  }
  const fromOriginal = r.originalUrl?.split("?")[0]
  if (fromOriginal?.startsWith("/")) {
    return fromOriginal
  }
  const base = r.baseUrl ?? ""
  const pathPart = r.path ?? ""
  const combined = `${base}${pathPart}`
  if (combined.startsWith("/")) {
    return combined
  }
  const raw = r.url?.split("?")[0] ?? ""
  if (raw.startsWith("/")) {
    return raw
  }
  return pathPart.startsWith("/") ? pathPart : `/${pathPart}`
}

/**
 * True for GET routes that list/read **products** and may send legacy `seller.*` in `fields`.
 * Uses a pathname check so we can register middleware on prefix wildcards like `/admin*`. Exact
 * matchers such as `/admin/products` are ignored in some Medusa setups (medusajs/medusa#15035).
 */
export function pathnameNeedsProductSellerFieldsRewrite(pathname: string): boolean {
  if (pathname.startsWith("/admin/")) {
    if (/^\/admin\/products(?:\/|$)/.test(pathname)) return true
    if (/^\/admin\/price-lists\/[^/]+\/products/.test(pathname)) return true
    if (/^\/admin\/sellers\/[^/]+\/products/.test(pathname)) return true
    return false
  }
  if (pathname.startsWith("/vendor/")) {
    if (/^\/vendor\/products(?:\/|$)/.test(pathname)) return true
    if (/^\/vendor\/price-lists\/[^/]+\/products/.test(pathname)) return true
    if (/^\/vendor\/product-categories\/[^/]+\/products/.test(pathname)) return true
    if (/^\/vendor\/sales-channels\/[^/]+\/products/.test(pathname)) return true
    if (/^\/vendor\/collections\/[^/]+\/products/.test(pathname)) return true
    return false
  }
  if (pathname.startsWith("/store/")) {
    if (/^\/store\/products(?:\/|$)/.test(pathname)) return true
    if (/^\/store\/v2\/products(?:\/|$)/.test(pathname)) return true
    if (/^\/store\/v2\/productlist/.test(pathname)) return true
    return false
  }
  return false
}

/**
 * Mercur product graph uses `sellers`, not `seller`. UIs / defaults may still send `seller`,
 * `seller.*`, `*seller`, or `+seller.*` in comma-separated Remote Query `fields`.
 */
export function rewriteProductFieldsSellerToSellers(fields: string): string {
  let s = fields
  // Medusa-style expansions: *seller → *sellers
  s = s.replace(/\*seller\b/g, "*sellers")
  // seller.*, seller.handle, +seller.* (word boundary handles leading +)
  s = s.replace(/\bseller\./g, "sellers.")
  // Bare list token: ",seller" / ",seller," / ",seller*" at end (not seller_id)
  s = s.replace(/(^|,)seller(?=\*|,|$)/g, "$1sellers")
  return s
}

export const rewriteProductQuerySellerToSellersFields = (
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const raw = req.query?.fields
  if (typeof raw === "string") {
    ;(req.query as Record<string, unknown>).fields = rewriteProductFieldsSellerToSellers(raw)
  } else if (Array.isArray(raw)) {
    ;(req.query as Record<string, unknown>).fields = raw.map((f) =>
      typeof f === "string" ? rewriteProductFieldsSellerToSellers(f) : f
    )
  }
  next()
}

/**
 * Wildcard matchers (e.g. `/admin*`) + pathname guard. Omit `method` so these register as
 * **global** middleware and run before Medusa core **route** middleware (which reads `fields`).
 * Exact matchers like `/admin/products` can also be ignored (medusajs/medusa#15035).
 *
 * @see https://docs.medusajs.com/learn/fundamentals/api-routes/middlewares
 */
export const rewriteProductQuerySellerToSellersFieldsIfProductPath = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  if (req.method !== "GET") {
    return next()
  }
  if (!pathnameNeedsProductSellerFieldsRewrite(requestPathname(req))) {
    return next()
  }
  return rewriteProductQuerySellerToSellersFields(req, res, next)
}