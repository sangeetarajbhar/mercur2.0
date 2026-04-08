import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { EXTRA_CHARGE_MODULE } from "../../../../modules/extra-charge"
import ExtraChargeService from "../../../../modules/extra-charge/service"
import { AdminUpdateExtraCharge } from "../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ExtraChargeService>(EXTRA_CHARGE_MODULE)
  const [extra_charge] = await service.listExtraCharges({ id: req.params.id })
  res.json({ extra_charge })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ExtraChargeService>(EXTRA_CHARGE_MODULE)
  const data = AdminUpdateExtraCharge.parse(req.body)
  const actorId = req.auth_context?.actor_id || "system"
  const extra_charge = await service.updateExtraCharges({
    ...data,
    id: req.params.id,
    updated_by: actorId,
  })
  res.json({ extra_charge })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ExtraChargeService>(EXTRA_CHARGE_MODULE)
  await service.softDeleteExtraCharges(req.params.id)
  res.json({ id: req.params.id, object: "extra_charge", deleted: true })
}
