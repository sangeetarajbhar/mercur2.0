import { z } from "zod";

export enum AttributeUIComponent {
  SELECT = "select",
  MULTIVALUE = "multivalue",
  UNIT = "unit",
  TOGGLE = "toggle",
  TEXTAREA = "text_area",
  COLOR_PICKER = "color_picker",
}

export type AttributePossibleValueDTO = {
  id: string;
  value: string;
  rank: number;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type AttributeProductCategory = {
  id: string;
  name: string;
};

export type AttributeDTO = {
  id: string;
  name: string;
  description?: string | null;
  handle: string;
  is_filterable: boolean;
  is_required: boolean;
  ui_component: AttributeUIComponent | string;
  metadata?: Record<string, unknown> | null;
  possible_values?: AttributePossibleValueDTO[];
  product_categories?: AttributeProductCategory[];
  created_at?: string;
  updated_at?: string;
};

export const AdminCreateAttributeValue = z.object({
  value: z.string().min(1),
  rank: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export const AdminUpdateAttributeValueSchema = z.object({
  id: z.string().optional(),
  value: z.string().optional(),
  rank: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateAttribute = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  is_filterable: z.boolean().optional(),
  is_required: z.boolean().optional(),
  ui_component: z
    .nativeEnum(AttributeUIComponent)
    .default(AttributeUIComponent.SELECT),
  handle: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  possible_values: z.array(AdminCreateAttributeValue).optional(),
  product_category_ids: z.array(z.string()).optional(),
});

export const AdminUpdateAttribute = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    handle: z.string().optional(),
    is_filterable: z.boolean().optional(),
    is_required: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
    ui_component: z.nativeEnum(AttributeUIComponent).optional(),
    product_category_ids: z.array(z.string()).optional(),
    possible_values: z.array(AdminUpdateAttributeValueSchema).optional(),
  })
  .strict();

export type CreateAttributeType = z.infer<typeof CreateAttribute>;
export type AdminUpdateAttributeType = z.infer<typeof AdminUpdateAttribute>;
