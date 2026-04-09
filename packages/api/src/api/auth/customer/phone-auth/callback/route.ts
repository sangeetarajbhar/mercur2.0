import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import type { IAuthModuleService } from "@medusajs/framework/types"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { phone, otp } = req.body as { phone: string; otp: string }
  const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH)
  const result = await authModuleService.validateCallback("phone-auth", { body: { phone, otp } })

  if (!result.success || !result.authIdentity) {
    return res.status(400).json({ success: false, error: result.error || "Invalid OTP" })
  }

  return res.json({
    success: true,
    user: {
      id: result.authIdentity.id,
    },
  })
}
