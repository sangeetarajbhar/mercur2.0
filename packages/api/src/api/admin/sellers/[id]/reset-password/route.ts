import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { IAuthModuleService } from "@medusajs/framework/types"

type ChangePasswordInput = {
  password: string
  confirmPassword: string
}

export const POST = async (
  req: AuthenticatedMedusaRequest<ChangePasswordInput>,
  res: MedusaResponse
) => {
  const sellerId = req.params.id
  const { password, confirmPassword } = (req.body as any) || {}
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const authService = req.scope.resolve(Modules.AUTH)
  req.scope.resolve(Modules.EVENT_BUS)

  if (!password || !confirmPassword) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Password and confirm password are required.")
  }
  if (password.length < 8) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Password must be at least 8 characters long.")
  }
  if (password !== confirmPassword) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Password and confirm password do not match.")
  }

  const {
    data: [seller],
  } = await query.graph(
    {
      entity: "seller",
      fields: ["id", "name", "members.id", "members.email"],
      filters: { id: sellerId },
    },
    { throwIfKeyNotFound: true }
  )

  const primaryMember = (seller as any).members?.[0]
  if (!primaryMember?.email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Seller has no members or email associated. Cannot change password."
    )
  }

  try {
    const authServiceTyped = authService as IAuthModuleService
    const updateData = {
      password,
      entity_id: primaryMember.email,
    }

    const { authIdentity, success, error } = await authServiceTyped.updateProvider(
      "emailpass",
      updateData as any
    )

    if (!success || !authIdentity) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, error || "Failed to update password")
    }

    res.json({ message: "Password changed successfully", email: primaryMember.email })
  } catch (error: any) {
    if (error instanceof MedusaError) {
      throw error
    }
    throw new MedusaError(MedusaError.Types.INVALID_DATA, error?.message || "Failed to change password")
  }
}

