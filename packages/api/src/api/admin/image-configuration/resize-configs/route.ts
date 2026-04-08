import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import {
  createResizeConfigWorkflow,
  getAllResizeConfigWorkflow,
} from "../../../../workflows/image-configuration/workflows"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await createResizeConfigWorkflow(req.scope).run({ input: req.validatedBody as any })
  res.json({ resizeConfig: result })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await getAllResizeConfigWorkflow(req.scope).run({ input: {} })
  res.json({ resize_config: result })
}
