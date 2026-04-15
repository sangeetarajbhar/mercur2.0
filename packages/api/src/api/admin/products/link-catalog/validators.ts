import { z } from "zod"

export const PostLinkCatalogSchema = z.object({
  source_seller_id: z.string(),
  target_seller_id: z.string(),
  product_ids: z.array(z.string()),
})