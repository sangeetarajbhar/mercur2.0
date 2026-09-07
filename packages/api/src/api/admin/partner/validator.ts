import { z } from "zod"

export const PostAdminCreatePartner = z.object({
  name: z.string(),
  status: z.string(),
  metadata: z.string().optional().nullable(),
})
