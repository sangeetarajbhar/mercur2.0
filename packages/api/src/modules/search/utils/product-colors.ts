/**
 * YesPlz `primaryColour` from Medusa **product-level** options only (`product.options`).
 * Matches options whose title is "Color" or "colour" (case-insensitive).
 *
 * These values are not written to SearchService `filters` — only the YesPlz field `primaryColour`.
 */

const COLOR_OPTION_TITLES = new Set(['color', 'colour'])

/** Minimal shape: what `fetchProducts` passes into the YesPlz transformer. */
export type ProductWithOptions = {
  options?: Array<{
    title?: string
    values?: Array<{ value?: string }>
  }>
}

function normalizeTitle(title: unknown): string {
  return String(title ?? '').trim().toLowerCase()
}

function isColorOption(title: unknown): boolean {
  return COLOR_OPTION_TITLES.has(normalizeTitle(title))
}

/**
 * First non-empty color value from product-level Color option(s), or `null`.
 * Stops at the first value found (no full scan / dedupe — enough for a single primary colour).
 */
export function resolveYesPlzPrimaryColour(product: ProductWithOptions): string | null {
  for (const option of product.options ?? []) {
    if (!isColorOption(option.title)) {
      continue
    }
    for (const row of option.values ?? []) {
      const raw = row?.value
      if (raw == null || raw === '') {
        continue
      }
      const trimmed = String(raw).trim()
      if (trimmed) {
        return trimmed
      }
    }
  }
  return null
}
