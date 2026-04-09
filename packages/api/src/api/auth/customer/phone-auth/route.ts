import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import type { IAuthModuleService } from "@medusajs/framework/types"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { phone } = req.body as { phone: string }
  const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH)

  await authModuleService.register("phone-auth", { body: { phone } })
  const result = await authModuleService.authenticate("phone-auth", { body: { phone } })

  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error || "Authentication failed" })
  }

  return res.json({ success: true, message: "OTP generated", phone })
}
