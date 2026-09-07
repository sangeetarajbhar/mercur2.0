import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { EXTRA_CHARGE_MODULE } from "../../../modules/extra-charge"
import ExtraChargeService from "../../../modules/extra-charge/service"
import { AdminCreateExtraCharge } from "./validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ExtraChargeService>(EXTRA_CHARGE_MODULE)
  const extra_charges = await service.listExtraCharges(req.query as Record<string, unknown>)
  res.json({ extra_charges })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ExtraChargeService>(EXTRA_CHARGE_MODULE)
  const data = AdminCreateExtraCharge.parse(req.body)
  const actorId = req.auth_context.actor_id
  const extra_charge = await service.createExtraCharges({
    ...data,
    created_by: actorId,
    updated_by: actorId,
  })
  res.status(201).json({ extra_charge })
}
