import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { createImageSizeWorkflow, getAllImageWorkflow } from "../../../../workflows/image-configuration/workflows"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await createImageSizeWorkflow(req.scope).run({ input: req.validatedBody as any })
  res.json({ imageSizes: result })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { result } = await getAllImageWorkflow(req.scope).run({ input: {} })
  res.json({ image_sizes: result })
}
