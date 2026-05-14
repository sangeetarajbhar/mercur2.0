import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { fetchSellerByAuthActorId } from "../../../../../shared/infra/http/utils/seller"

const getOnboarding = async (req: AuthenticatedMedusaRequest) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const {
    data: [onboarding],
  } = await query.graph({
    entity: "seller_onboarding",
    fields: req.queryConfig.fields,
    filters: {
      seller_id: seller.id,
    },
  })

  return onboarding
}

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const onboarding = await getOnboarding(req)
  res.json({ onboarding })
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const onboarding = await getOnboarding(req)
  res.json({ onboarding })
}

