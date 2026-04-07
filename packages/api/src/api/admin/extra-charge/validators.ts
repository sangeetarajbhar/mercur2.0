import { z } from "zod"

export const AdminCreateExtraCharge = z.object({
  name: z.string(),
  amount: z.number(),
  status: z.enum(["active", "inactive"]).default("active"),
  type: z.string(),
})

export const AdminUpdateExtraCharge = z.object({
  name: z.string().optional(),
  amount: z.number().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  type: z.string().optional(),
})

export const AdminExtraChargeParams = z.object({
  id: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  name: z.string().optional(),
  type: z.string().optional(),
})
