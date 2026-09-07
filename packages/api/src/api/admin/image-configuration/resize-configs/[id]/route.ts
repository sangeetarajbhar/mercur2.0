import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { updateResizeConfigWorkflow } from "../../../../../workflows/image-configuration/workflows"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await updateResizeConfigWorkflow(req.scope).run({
    input: { id: req.params.id, ...(req.body as object) },
  })
  res.json({ resize_config: result })
}
