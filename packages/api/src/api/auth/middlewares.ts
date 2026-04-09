import { MiddlewareRoute, validateAndTransformBody } from "@medusajs/framework"
import { z } from "zod"

const indianPhoneRegex = /^[6-9]\d{9}$/

const PhoneAuthBodySchema = z
  .object({
    phone: z
      .string()
      .min(1, "Phone number is required")
      .transform((val) => val.trim())
      .refine((val) => indianPhoneRegex.test(val), {
        message: "Phone number must be 10 digits starting with 6-9",
      }),
  })
  .strict()

const PhoneAuthCallbackBodySchema = z
  .object({
    phone: z.string().min(1),
    otp: z.string().min(1),
  })
  .strict()

export const authMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/auth/customer/phone-auth",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PhoneAuthBodySchema)],
  },
  {
    matcher: "/auth/customer/phone-auth/callback",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PhoneAuthCallbackBodySchema)],
  },
]
