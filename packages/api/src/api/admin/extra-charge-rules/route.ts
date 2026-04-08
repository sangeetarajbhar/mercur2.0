import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { EXTRA_CHARGE_MODULE } from "../../../modules/extra-charge"
import ExtraChargeService from "../../../modules/extra-charge/service"
import { AdminCreateExtraChargeRule } from "./validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ExtraChargeService>(EXTRA_CHARGE_MODULE)
  const extra_charge_rules = await service.listExtraChargeRules(req.query as Record<string, unknown>)
  res.json({ extra_charge_rules })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ExtraChargeService>(EXTRA_CHARGE_MODULE)
  const data = AdminCreateExtraChargeRule.parse(req.body)
  const actorId = req.auth_context.actor_id
  const extra_charge_rule = await service.createExtraChargeRules({
    ...data,
    created_by: actorId,
    updated_by: actorId,
  })
  res.status(201).json({ extra_charge_rule })
}
