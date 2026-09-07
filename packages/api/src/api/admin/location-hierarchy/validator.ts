import { z } from "zod"

export const PostAdminCreateLocationHierarchy = z.object({
  parent_location_id: z.string(),
  child_location_id: z.string(),
  promise_minutes: z.number().int().min(0),
  id: z.string().optional(),
})
