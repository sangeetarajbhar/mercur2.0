import { z } from "zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"

export const AdminCreateRefundMethodSchema = z
  .object({
    customer_id: z.string(),
    type: z.enum(["bank", "upi"]),
    account_number: z.string().optional(),
    ifsc_code: z.string().optional(),
    account_holder_name: z.string().optional(),
    upi_id: z.string().optional(),
    is_default: z.boolean().optional(),
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

export const AdminListRefundMethodsSchema = createFindParams({ limit: 50, offset: 0 }).extend({
  customer_id: z.string().optional(),
})
