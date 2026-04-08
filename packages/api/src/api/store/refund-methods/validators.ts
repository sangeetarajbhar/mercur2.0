import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

const accountNumberSchema = z.string().min(9).max(18).regex(/^[0-9]+$/)
const ifscCodeSchema = z
  .string()
  .length(11)
  .regex(/^[A-Z]{4}0[0-9A-Z]{6}$/)
  .transform((val) => val.toUpperCase())
const upiIdSchema = z
  .string()
  .min(5)
  .max(320)
  .regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/)
  .transform((val) => val.toLowerCase())
const accountHolderNameSchema = z.string().min(2).max(100).transform((val) => val.trim())

export const StoreCreateRefundMethodSchema = z
  .object({
  order_id: z.string().optional(),
  return_id: z.string().optional(),
  type: z.enum(["bank", "upi"]),
  is_default: z.boolean().optional().default(false),
    account_number: accountNumberSchema.optional(),
    ifsc_code: ifscCodeSchema.optional(),
    account_holder_name: accountHolderNameSchema.optional(),
    upi_id: upiIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "bank") {
      if (!data.account_number || !data.ifsc_code || !data.account_holder_name) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Bank details are required" })
      }
    }
    if (data.type === "upi" && !data.upi_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "UPI id is required" })
    }
  })

export const StoreListRefundMethodsSchema = createFindParams({ limit: 50, offset: 0 })
export const StoreSetDefaultRefundMethodSchema = z.object({})
export const StoreDeleteRefundMethodSchema = z.object({})
