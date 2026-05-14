import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

import { inviteSellerWorkflow } from "../../../../workflows/seller/workflows"
import type { AdminInviteSellerType } from "../validators"

/**
 * @oas [post] /admin/sellers/invite
 * operationId: "AdminInviteSeller"
 * summary: "Invite Seller"
 * description: "Sends an invitation to a new seller to join the platform."
 * x-authenticated: true
 * tags:
 *   - Admin Sellers
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function POST(
  req: MedusaRequest<AdminInviteSellerType>,
  res: MedusaResponse
): Promise<void> {
  const { result: invitation } = await inviteSellerWorkflow.run({
    container: req.scope,
    input: req.validatedBody,
  })

  res.status(201).json({ invitation })
}

