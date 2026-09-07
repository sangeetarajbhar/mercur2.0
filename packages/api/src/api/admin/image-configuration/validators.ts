import { z } from "zod"

export const PostAdminCreateImageSize = z.object({
  name: z.string(),
  width: z.number(),
  height: z.number(),
})

export const PostAdminCreateResizeConfig = z.object({
  name: z.string(),
  unique_name: z.string(),
  image_size_id: z.array(z.string().min(1)),
})

export const PostAdminUpdateResizeConfig = z.object({
  id: z.string(),
  name: z.string(),
  unique_name: z.string(),
  image_size_id: z.array(z.string().min(1)),
})
