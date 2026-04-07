import { z } from "zod"

export const PostAdminCreateLocationHierarchy = z.object({
  parent_location_id: z.string(),
  child_location_id: z.string(),
  id: z.string().optional(),
})
