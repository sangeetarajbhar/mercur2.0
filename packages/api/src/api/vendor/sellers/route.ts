import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"

import { createSellersWorkflow } from "../../../workflows/seller/workflows"
import type { VendorCreateSellerType } from "./validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<VendorCreateSellerType>,
  res: MedusaResponse
) => {
  if (req.auth_context?.actor_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Request already authenticated as a seller.")
  }

  const { member, ...sellerData } = req.validatedBody
  const { result } = await createSellersWorkflow(req.scope).run({
    input: {
      sellers: [
        {
          ...sellerData,
          email: sellerData.email || member.email,
          member: {
            email: member.email,
          },
        } as any,
      ],
    },
  })

  res.status(201).json({ seller: (result as any)?.[0] ?? null })
}

