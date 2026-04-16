import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { ATTRIBUTE_MODULE } from "../../../modules/attribute"
import type {
  AdminCreateAttributeType,
  AdminGetAttributesParamsType,
} from "./validators"

export const GET = async (
  req: MedusaRequest<AdminGetAttributesParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  
  const { data: attributes = [], metadata } = await query.graph({
    entity: "attribute",
    fields: req.queryConfig?.fields,
    filters: req.filterableFields ?? {},
    pagination: req.queryConfig?.pagination,
  })

  res.json({
    attributes,
    count: metadata?.count ?? attributes.length,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? attributes.length,
  })
}

export const POST = async (
  req: MedusaRequest<AdminCreateAttributeType>,
  res: MedusaResponse
) => {
  const service = req.scope.resolve(ATTRIBUTE_MODULE) as any
  const payload = req.validatedBody
  const [attribute] = await service.createAttributes([
    {
      ...payload,
      handle: payload.handle ?? payload.name.toLowerCase().replace(/\s+/g, "-"),
      possible_values: payload.possible_values?.map((v, i) => ({
        value: v.value,
        rank: v.rank ?? i,
        metadata: v.metadata,
      })),
    },
  ])
  res.status(201).json({ attribute })
}
