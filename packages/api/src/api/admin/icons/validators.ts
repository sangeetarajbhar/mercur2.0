import { z } from "zod"

export type AdminSaveIconType = z.infer<typeof AdminSaveIcon>
export const AdminSaveIcon = z.object({
  keyname: z.string().min(1, "Keyname is required"),
})

