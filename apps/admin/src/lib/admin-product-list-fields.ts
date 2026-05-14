/**
 * Product `fields` for admin lists — Mercur graph uses `sellers` on product (not `seller`).
 * Used by custom admin routes; API middleware normalizes legacy `seller.*` on GET /admin/products.
 */
export const ADMIN_PRODUCT_LIST_FIELDS =
  "id,title,handle,status,*collection,*sales_channels,variants.id,thumbnail,sellers.*,created_at,updated_at";
