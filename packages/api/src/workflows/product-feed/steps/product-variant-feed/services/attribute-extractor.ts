/**
 * Attribute Extractor Service
 * Single Responsibility: Extracts color and size attributes from variants/products
 * Note: Currently commented out - can be easily re-enabled
 */

export class AttributeExtractor {
  static extractColorAndSize(
    variant: any,
    product: any
  ): { color: string | undefined; size: string | undefined } {
    // Resolve color and size, preferring variant-level options, then variant fields, then product options
    let color: string | undefined
    let size: string | undefined

    const variantOptions = (variant as any).options || []
    const productOptions = (product as any).options || []

    if (Array.isArray(variantOptions) && variantOptions.length) {
      for (const opt of variantOptions) {
        const title = opt.option?.title?.toLowerCase?.()
        if (!title) {
          continue
        }

        if (!color && (title === "color" || title === "colour")) {
          color = opt.value
        }

        if (!size && title === "size") {
          size = opt.value
        }

        if (color && size) {
          break
        }
      }
    }

    if (!color && (variant as any).color) {
      color = (variant as any).color
    }

    if (!size && (variant as any).size) {
      size = (variant as any).size
    }

    if (
      (!color || !size) &&
      Array.isArray(productOptions) &&
      productOptions.length
    ) {
      for (const opt of productOptions) {
        const title = opt.title?.toLowerCase?.()
        if (!title) {
          continue
        }

        if (!color && (title === "color" || title === "colour")) {
          color = opt.values?.[0]?.value || color
        }

        if (!size && title === "size") {
          size = opt.values?.[0]?.value || size
        }

        if (color && size) {
          break
        }
      }
    }

    return { color, size }
  }
}
