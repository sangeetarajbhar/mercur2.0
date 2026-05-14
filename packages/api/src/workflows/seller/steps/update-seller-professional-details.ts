import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import {
  MercurModules,
  ProfessionalDetailsDTO,
  UpdateProfessionalDetailsDTO,
} from "@mercurjs/types"

import SellerModuleService from "../../../modules/seller/service"


export const updateSellerProfessionalDetailsStep = createStep<
  { seller_id: string; data: UpdateProfessionalDetailsDTO },
  ProfessionalDetailsDTO,
  any
>(
  "update-seller-professional-details",
  async (
    { seller_id, data },
    { container }
  ) => {
    if (!seller_id || typeof seller_id !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "seller_id is required to update seller professional details"
      )
    }

    const service =
      container.resolve<SellerModuleService>(MercurModules.SELLER)

    const [seller] = await service.listSellers(
      { id: seller_id },
      { relations: ["professional_details"] }
    )

    let existingProf = (seller as any).professional_details as any
    if (!existingProf) {
      const rows = await service.listProfessionalDetails({ seller_id })
      existingProf = rows?.[0]
    }

    const hasPatch = Object.keys(data || {}).length > 0

    if (!hasPatch) {
      if (existingProf) {
        return new StepResponse(
          existingProf as ProfessionalDetailsDTO,
          {
            existing: null,
            seller_id,
          }
        )
      }
      return new StepResponse(null as unknown as ProfessionalDetailsDTO, {
        existing: null,
        seller_id,
      })
    }

    /** Same as address: avoid `seller: { id }` stub — it triggers Seller.name validation errors. */
    const patch = { ...(data || {}) } as Record<string, unknown>
    delete patch.seller_id

    const basePayload = { ...patch, seller_id }

    if (existingProf) {
      const updated = await (service as any).updateProfessionalDetails([
        { id: existingProf.id, ...basePayload },
      ])
      const row = Array.isArray(updated) ? updated[0] : updated
      return new StepResponse(row, {
        existing: existingProf,
        seller_id,
      })
    }

    const created = await (service as any).createProfessionalDetails([basePayload])
    const row = Array.isArray(created) ? created[0] : created
    return new StepResponse(row, { existing: null, seller_id })
  },
  async ({ existing, seller_id }, { container }) => {
    const service =
      container.resolve<SellerModuleService>(MercurModules.SELLER)
    if (existing) {
      await service.updateProfessionalDetails(existing.id, existing)
    } else {
      const current = await service.listProfessionalDetails({ seller_id })
      if (current.length > 0) {
        await service.deleteProfessionalDetails([current[0].id])
      }
    }
  }
)
