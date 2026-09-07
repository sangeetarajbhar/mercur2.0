import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import PartnerModuleService from "../../../../modules/partner/service"
import { PARTNER_MODULE } from "../../../../modules/partner"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const partnerService = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  await partnerService.softDeletePartners(req.params.id)
  return res.json({ message: "Partner deleted successfully" })
}
