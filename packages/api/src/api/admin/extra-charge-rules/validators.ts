import { z } from "zod"

export const AdminCreateExtraChargeRule = z.object({
  extra_charge_id: z.string(),
  name: z.string(),
  attribute: z.string(),
  operator: z.enum(["eq", "in", "gt", "lt", "gte", "lte"]),
  values: z.array(z.string()),
  priority: z.number().default(0),
  status: z.enum(["active", "inactive"]).default("active"),
})

export const AdminUpdateExtraChargeRule = z.object({
  extra_charge_id: z.string().optional(),
  name: z.string().optional(),
  attribute: z.string().optional(),
  operator: z.enum(["eq", "in", "gt", "lt", "gte", "lte"]).optional(),
  values: z.array(z.string()).optional(),
  priority: z.number().optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export const AdminExtraChargeRuleParams = z.object({
  id: z.string().optional(),
  extra_charge_id: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  attribute: z.string().optional(),
})
