import { z } from "zod"
import {
  createFindParams,
  createOperatorMap,
  createSelectParams,
} from "@medusajs/medusa/api/utils/validators"

const uiComponentEnum = z.enum([
  "select",
  "multivalue",
  "unit",
  "toggle",
  "text_area",
  "color_picker",
])

export const AdminGetAttributesParams = createFindParams({
  offset: 0,
  limit: 50,
}).merge(
  z.object({
    id: z.union([z.string(), z.array(z.string())]).optional(),
    name: createOperatorMap(z.string()).optional(),
    handle: z.union([z.string(), z.array(z.string())]).optional(),
    is_required: z.boolean().optional(),
    is_filterable: z.boolean().optional(),
    created_at: createOperatorMap().optional(),
    updated_at: createOperatorMap().optional(),
    ui_component: uiComponentEnum.optional(),
    q: z.string().optional(),
  })
)

export const AdminGetAttributeParams = createSelectParams()

export const AdminCreateAttribute = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  handle: z.string().optional(),
  is_filterable: z.boolean().optional(),
  is_required: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
  ui_component: uiComponentEnum.optional(),
  possible_values: z
    .array(
      z.object({
        value: z.string().min(1),
        rank: z.number().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .optional(),
})

export const AdminUpdateAttribute = AdminCreateAttribute.partial()

export type AdminGetAttributesParamsType = z.infer<typeof AdminGetAttributesParams>
export type AdminGetAttributeParamsType = z.infer<typeof AdminGetAttributeParams>
export type AdminCreateAttributeType = z.infer<typeof AdminCreateAttribute>
export type AdminUpdateAttributeType = z.infer<typeof AdminUpdateAttribute>
