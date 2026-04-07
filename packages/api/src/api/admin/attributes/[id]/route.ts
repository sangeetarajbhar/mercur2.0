import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ATTRIBUTE_MODULE } from "../../../../modules/attribute"
import type {
  AdminGetAttributeParamsType,
  AdminUpdateAttributeType,
} from "../validators"

export const GET = async (
  req: MedusaRequest<AdminGetAttributeParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [attribute] = [] } = await query.graph({
    entity: "attribute",
    fields: req.queryConfig?.fields,
    filters: { id: req.params.id },
  })
  if (!attribute) {
    return res.status(404).json({ message: "Attribute not found" })
  }
  res.json({ attribute })
}

export const POST = async (
  req: MedusaRequest<AdminUpdateAttributeType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve(ATTRIBUTE_MODULE) as any
  const body = req.validatedBody
  const [attribute] = await service.updateAttributes([
    {
      id: req.params.id,
      ...body,
      ...(body.name && !body.handle
        ? { handle: body.name.toLowerCase().replace(/\s+/g, "-") }
        : {}),
    },
  ])
  res.json({ attribute })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(ATTRIBUTE_MODULE) as any
  await service.deleteAttributes([req.params.id])
  res.json({ id: req.params.id, object: "attribute", deleted: true })
}
