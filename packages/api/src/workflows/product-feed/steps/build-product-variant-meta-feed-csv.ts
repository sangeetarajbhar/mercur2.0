import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { VariantInventoryFeedItem } from "./product-variant-inventory-feed/types"

type StepInput = {
  items: VariantInventoryFeedItem[]
}

const escapeCsvValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return ""
  }

  const str = String(value)

  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

export const buildProductVariantMetaFeedCsvStep = createStep(
  "build-product-variant-meta-feed-csv",
  async (input: StepInput) => {
    const header = [
      "id",
      "region_id",
      "availability",
    ]

    const lines = [
      header.join(","),
      ...input.items.map((item) => {
        // id = shopify_variant_id if available, otherwise EAN code (already computed in step)
        const id = item.id || ""
        // region_id = warehouse_code
        const regionId = item.warehouse_code || ""

        return [
          escapeCsvValue(id),
          escapeCsvValue(regionId),
          escapeCsvValue(item.availability),
        ].join(",")
      }),
    ]

    const csv = lines.join("\n")

    return new StepResponse(csv)
  }
)


