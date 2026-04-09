import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import PartnerModuleService from "../../../modules/partner/service"
import { PARTNER_MODULE } from "../../../modules/partner"

export type CreatePartnerStepInput = {
  name: string
  status: string
  metadata?: string | null
}

export const createPartnerStep = createStep(
  "create-partner-step",
  async (input: CreatePartnerStepInput, { container }) => {
    const partnerModuleService: PartnerModuleService =
      container.resolve(PARTNER_MODULE)
    const partner = await partnerModuleService.createPartners(input)
    return new StepResponse(partner, partner.id)
  },
  async (id, { container }) => {
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Partner ID is required for compensation"
      )
    }
    const partnerModuleService: PartnerModuleService =
      container.resolve(PARTNER_MODULE)
    await partnerModuleService.softDeletePartners(id)
  }
)
