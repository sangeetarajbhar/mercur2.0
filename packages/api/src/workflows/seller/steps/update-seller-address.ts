import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { MercurModules, SellerAddressDTO, UpdateSellerAddressDTO } from "@mercurjs/types"

import SellerModuleService from "../../../modules/seller/service"

export const updateSellerAddressStep = createStep<
  { seller_id: string; data: UpdateSellerAddressDTO },
  SellerAddressDTO,
  any
>(
  "update-seller-address",
  async (
    {
      seller_id,
      data,
    },
    { container }
  ) => {
    if (!seller_id || typeof seller_id !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "seller_id is required to update seller address"
      )
    }

    const service =
      container.resolve<SellerModuleService>(MercurModules.SELLER)

    const [seller] = await service.listSellers(
      { id: seller_id },
      { relations: ["address"] }
    )

    /** Relation hydration on `listSellers` can miss `address`; FK lookup is authoritative. */
    let existingAddress = (seller as any).address as any
    if (!existingAddress) {
      const rows = await service.listSellerAddresses({ seller_id })
      existingAddress = rows?.[0]
    }

    const hasPatch = Object.keys(data || {}).length > 0

    if (!hasPatch) {
      if (existingAddress) {
        return new StepResponse(existingAddress as SellerAddressDTO, {
          existing: null,
          seller_id,
        })
      }
      return new StepResponse(null as unknown as SellerAddressDTO, {
        existing: null,
        seller_id,
      })
    }

    /**
     * Use `seller_id` only. Passing `seller: { id }` makes MikroORM attach a stub `Seller`
     * without `name`, which then fails validation on flush (`Seller.name is required`).
     */
    const patch = { ...(data || {}) } as Record<string, unknown>
    delete patch.seller_id

    const basePayload = { ...patch, seller_id }

    if (existingAddress) {
      const updated = await (service as any).updateSellerAddresses([
        { id: existingAddress.id, ...basePayload },
      ])
      const row = Array.isArray(updated) ? updated[0] : updated
      return new StepResponse(row, {
        existing: existingAddress,
        seller_id,
      })
    }

    const created = await (service as any).createSellerAddresses([basePayload])
    const row = Array.isArray(created) ? created[0] : created
    return new StepResponse(row, { existing: null, seller_id })
  },
  async ({ existing, seller_id }, { container }) => {
    const service =
      container.resolve<SellerModuleService>(MercurModules.SELLER)
    if (existing) {
      await service.updateSellerAddresses(existing.id, existing)
    } else {
      const current = await service.listSellerAddresses({ seller_id })
      if (current.length > 0) {
        await service.deleteSellerAddresses([current[0].id])
      }
    }
  }
)
