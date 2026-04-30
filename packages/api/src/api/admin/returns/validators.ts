import { z } from "zod"

export const AdminPostReturnsConfirmRequestReqSchema = z.object({
  no_notification: z.boolean().optional(),
})

export type AdminPostReturnsConfirmRequestReqSchemaType = z.infer<
  typeof AdminPostReturnsConfirmRequestReqSchema
>

export const AdminPostReturnsStatusUpdateReqSchema = z.object({
  status: z.enum(["refunded"]),
  internal_note: z.string().optional(),
})

export type AdminPostReturnsStatusUpdateReqSchemaType = z.infer<
  typeof AdminPostReturnsStatusUpdateReqSchema
>
export const AdminPostCancelReturnReqSchema = z.object({
  no_notification: z.boolean().optional(),
})

export type AdminPostCancelReturnReqSchemaType = z.infer<
  typeof AdminPostCancelReturnReqSchema
>

export const AdminPostReturnExtensionReqSchema = z.object({
  status: z.string().min(1, "status is required"),
  date: z.string().datetime(),
})

export type AdminPostReturnExtensionReqSchemaType = z.infer<
  typeof AdminPostReturnExtensionReqSchema
>
