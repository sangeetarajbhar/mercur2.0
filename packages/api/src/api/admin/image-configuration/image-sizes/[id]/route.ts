import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { deleteImageSizesWorkflow } from "../../../../../workflows/image-configuration/workflows"

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  await deleteImageSizesWorkflow(req.scope).run({ input: { id: req.params.id } })
  res.status(200).json({ success: true })
}
