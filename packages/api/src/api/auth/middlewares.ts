import { MiddlewareRoute, validateAndTransformBody } from "@medusajs/framework"
import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { ConfigModule } from "@medusajs/framework"
import { parseCorsOrigins } from "@medusajs/framework/utils"
import cors from "cors"
import { z } from "zod"

const authCorsWithExposedHeaders = (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const configModule: ConfigModule = req.scope.resolve('configModule')
    return cors({
      origin: parseCorsOrigins(configModule.projectConfig.http.authCors),
      credentials: true,
      exposedHeaders: ['authorization', 'Authorization']
    })(req, res, next)
}

const PhoneAuthCallbackBodySchema = z.object({
  phone: z.string().min(1, "Phone is required"),
  otp: z.string().min(1, "OTP is required"),
  is_new_user: z.boolean(),
  agent_type: z.enum(["app", "web"]).optional().default("web"),
})

// Indian mobile format: 10 digits starting with 6-9, no symbols
const indianPhoneRegex = /^[6-9]\d{9}$/

const PhoneAuthBodySchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .transform((val) => val.trim())
    .refine(
      (val) => indianPhoneRegex.test(val),
      {
        message: "Phone number must be 10 digits starting with 6-9",
      }
    ),
  hash_code: z.string().optional().default("gtX66zaes70"),
}).strict()

export const authMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/auth/customer/phone-auth",
    methods: ["POST"],
    middlewares: [
      authCorsWithExposedHeaders,
      validateAndTransformBody(PhoneAuthBodySchema),
    ],
  },
  {
    matcher: "/auth/customer/phone-auth/callback",
    methods: ["POST"],
    middlewares: [
      authCorsWithExposedHeaders,
      validateAndTransformBody(PhoneAuthCallbackBodySchema),
    ],
  },
  {
    matcher: "/auth/token/refresh-v2",
    methods: ["POST"],
    middlewares: [authCorsWithExposedHeaders],
  },
]


