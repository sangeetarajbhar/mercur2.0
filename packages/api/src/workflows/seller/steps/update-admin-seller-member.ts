import { MedusaError } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { MercurModules } from "@mercurjs/types"

import SellerModuleService from "../../../modules/seller/service"

const SELLER_MODULE = "seller"

type UpdateAdminSellerMemberInput = {
  member: Record<string, unknown> | null | undefined
  sellerId: string
}

/**
 * Updates the primary seller member (owner) on admin onboarding edit.
 * Mirrors zilo-medusa-backend `updateSellerMemberStep` for Mercur’s Member + many-to-many model.
 */
export const updateAdminSellerMemberStep = createStep(
  "update-admin-seller-member",
  async ({ member, sellerId }: UpdateAdminSellerMemberInput, { container }) => {
    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)

    const [seller] = await service.listSellers(
      { id: sellerId },
      { relations: ["members"] }
    )

    const members = (seller as any)?.members as any[] | undefined
    const existing = Array.isArray(members) && members.length > 0 ? members[0] : null

    if (!existing) {
      return new StepResponse(null, null)
    }

    if (member?.email !== undefined && member.email !== existing.email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Email cannot be updated. Email is used for authentication and cannot be changed."
      )
    }

    const { email: _removed, ...memberUpdateData } = member || {}

    const updated = await (service as any).updateMembers({
      ...existing,
      ...memberUpdateData,
      email: existing.email,
      id: existing.id,
    })

    return new StepResponse(updated, { ...existing })
  },
  async (prevMember: Record<string, unknown> | null, { container }) => {
    if (!prevMember) {
      return
    }
    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)
    await (service as any).updateMembers(prevMember)
  }
)
