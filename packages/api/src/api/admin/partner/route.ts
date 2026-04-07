import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { PARTNER_MODULE } from "../../../modules/partner"
import PartnerModuleService from "../../../modules/partner/service"
import { createPartnerWorkflow } from "../../../workflows/partner/workflows"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const partnerService = req.scope.resolve(PARTNER_MODULE) as PartnerModuleService
  const limit = Number(req.query.limit) || 10
  const offset = Number(req.query.offset) || 0
  const [partners, count] = await partnerService.listAndCountPartners({}, { skip: offset, take: limit })
  res.json({ partners, count, limit, offset })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await createPartnerWorkflow(req.scope).run({ input: req.body as any })
  res.json({ partner: result })
}
