import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { VariantFeedItem } from "./get-product-variant-feed-items"

type StepInput = {
  items: VariantFeedItem[]
  /**
   * Optional list of column identifiers to include in the CSV, in order.
   * If omitted or empty, all default columns are included.
   *
   * Supported identifiers (case-insensitive):
   * - variant_id (CSV header: id)
   * - item_group_id
   * - (legacy) Shopify_IN_ID_Variant — see commented ALL_COLUMNS entries below
   * - title
   * - description
   * - link
   * - image_link
   * - additional_image_link
   * - price
   * - sale_price
   * - brand
   * - gender
   * - gender_product
   * - product_type
   * - identifier
   * - gtin
   * - color
   * - size
   */
  fields?: string[]
}

const escapeCsvValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return ""
  }

  const str = String(value)

  // If the value contains any special CSV chars, wrap it in quotes and escape quotes
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

type ColumnDef = {
  id: string
  header: string
  getter: (item: VariantFeedItem) => string | number | null | undefined
}

// Full set of available columns with their headers and value mappers.
const ALL_COLUMNS: ColumnDef[] = [
  // Legacy (git pre–Medusa id columns):
  // {
  //   id: "Shopify_IN_ID_Variant",
  //   header: "id",
  //   getter: (item) => item.Shopify_IN_ID_Variant,
  // },
  // // {
  // //   id: "id",
  // //   header: "id",
  // //   getter: (item) => item.variant_id,
  // // },
  {
    id: "variant_id",
    header: "id",
    getter: (item) => item.variant_id,
  },
  {
    id: "item_group_id",
    header: "item_group_id",
    getter: (item) => item.product_id,
  },
  {
    id: "sku",
    header: "sku",
    getter: (item) => item.sku ?? "",
  },
  {
    id: "title",
    header: "title",
    getter: (item) => item.title,
  },
  {
    id: "description",
    header: "description",
    getter: (item) => item.description ?? "",
  },
  {
    id: "condition",
    header: "condition",
    getter: () => "new",
  },
  {
    id: "link",
    header: "link",
    getter: (item) => item.link,
  },
  {
    id: "image_link",
    header: "image_link",
    getter: (item) => item.image_link,
  },
  {
    id: "additional_image_link",
    header: "additional_image_link",
    getter: (item) => item.additional_image_link,
  },
  {
    id: "availability",
    header: "availability",
    getter: (item) => item.availability,
  },
  {
    id: "price",
    header: "price",
    getter: (item) => item.price,
  },
  {
    id: "sale_price",
    header: "sale_price",
    getter: (item) => item.sale_price ?? "",
  },
  {
    id: "brand",
    header: "brand",
    getter: (item) => item.brand ?? "",
  },
  {
    id: "gender",
    header: "gender",
    getter: (item) => item.gender ?? "unisex",
  },
  {
    id: "gender_product",
    header: "custom label 0",
    getter: (item) => item.gender_product || "unisex",
  },
  {
    id: "product_type",
    header: "product_type",
    getter: (item) => item.product_type ?? "",
  },
  {
    id: "identifier",
    header: "identifier exists",
    getter: (item) => item.identifier ?? "",
  },
  {
    id: "gtin",
    header: "gtin",
    getter: (item) => item.gtin ?? "",
  },
  {
    id: "color",
    header: "color",
    getter: (item) => item.color ?? "",
  },
  {
    id: "size",
    header: "size",
    getter: (item) => item.size ?? "",
  },
]

export const buildProductVariantFeedCsvStep = createStep(
  "build-product-variant-feed-csv",
  async (input: StepInput) => {
    const requested = (input.fields || [])
      .map((f) => f?.toString().trim())
      .filter(Boolean)

    let columns: ColumnDef[]

    if (!requested.length) {
      // Default behavior: use all columns in the original order
      columns = ALL_COLUMNS
    } else {
      const byId = new Map(
        ALL_COLUMNS.map((c) => [c.id.toLowerCase(), c] as const)
      )

      columns = requested
        .map((name) => byId.get(name.toLowerCase()))
        .filter((c): c is ColumnDef => Boolean(c))

      // Fallback to all columns if none of the requested ones are valid
      if (!columns.length) {
        columns = ALL_COLUMNS
      }
    }

    const header = columns.map((c) => c.header)

    const lines = [
      header.join(","), // header row
      ...input.items.map((item) =>
        columns
          .map((col) => escapeCsvValue(col.getter(item)))
          .join(",")
      ),
    ]

    const csv = lines.join("\n")

    return new StepResponse(csv)
  }
)

