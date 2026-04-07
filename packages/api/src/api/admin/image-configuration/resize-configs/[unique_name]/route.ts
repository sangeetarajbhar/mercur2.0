import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import {
  deleteResizeConfigWorkflow,
  getResizeConfigWorkflow,
} from "../../../../../workflows/image-configuration/workflows"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await getResizeConfigWorkflow(req.scope).run({
    input: { unique_name: req.params.unique_name },
  })
  res.json({ resize_config: result })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  await deleteResizeConfigWorkflow(req.scope).run({
    input: { unique_name: req.params.unique_name },
  })
  res.status(200).json({ success: true })
}
