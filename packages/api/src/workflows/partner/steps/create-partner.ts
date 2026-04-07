import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import PartnerModuleService from "../../../modules/partner/service"
import { PARTNER_MODULE } from "../../../modules/partner"

export const createPartnerStep = createStep(
  "create-partner-step",
  async (input: { name: string; status: string }, { container }) => {
    const service: PartnerModuleService = container.resolve(PARTNER_MODULE)
    const partner = await service.createPartners(input)
    return new StepResponse(partner, partner.id)
  },
  async (id: string, { container }) => {
    if (!id) throw new MedusaError(MedusaError.Types.INVALID_DATA, "Partner ID is required")
    const service: PartnerModuleService = container.resolve(PARTNER_MODULE)
    await service.softDeletePartners(id)
  }
)
