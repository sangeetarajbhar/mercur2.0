import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: [attribute] = [] } = await query.graph({
    entity: "attribute",
    fields: req.queryConfig?.fields ?? [
      "id",
      "name",
      "description",
      "handle",
      "is_filterable",
      "is_required",
      "ui_component",
      "metadata",
      "*possible_values",
    ],
    filters: { id: req.params.id },
  })

  if (!attribute) {
    return res.status(404).json({ message: "Attribute not found" })
  }

  res.json({ attribute })
}
