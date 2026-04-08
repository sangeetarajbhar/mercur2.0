import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { EXTRA_CHARGE_MODULE } from "../../../../modules/extra-charge"
import ExtraChargeService from "../../../../modules/extra-charge/service"
import { AdminUpdateExtraChargeRule } from "../validators"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ExtraChargeService>(EXTRA_CHARGE_MODULE)
  const data = AdminUpdateExtraChargeRule.parse(req.body)
  const actorId = req.auth_context.actor_id
  const extra_charge_rule = await service.updateExtraChargeRules({
    ...data,
    id: req.params.id,
    updated_by: actorId,
  })
  res.json({ extra_charge_rule })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ExtraChargeService>(EXTRA_CHARGE_MODULE)
  await service.softDeleteExtraChargeRules(req.params.id)
  res.json({ id: req.params.id, object: "extra_charge_rule", deleted: true })
}
