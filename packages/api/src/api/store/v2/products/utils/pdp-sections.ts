import {
  extractGenderFromProduct,
  getComplementaryCategories,
  getMainCategoryName,
} from './related-products'
import { STORE_V2_PRODUCTLIST_PATH } from '../constants'

/**
 * Shared inputs for PLP cross-link builders (related / “Style it with” section).
 * All variants require {@link PdpCrossLinksBaseOptions.relatedLimit}.
 */
export interface PdpCrossLinksBaseOptions {
  /** Max items the frontend should request for related_products (1–50, typical default 8). */
  relatedLimit: number
}

/**
 * Full PDP: related + similar sections.
 * Add **required** PDP-only fields here when every PDP caller must pass them.
 * Add **optional** fields with defaults inside {@link fetchPdpCrossLinks} when appropriate.
 */
export interface PdpSectionOptions extends PdpCrossLinksBaseOptions {
  /** Max items the frontend should request for similar_products (1–50, typical default 15). */
  similarLimit: number
}

/**
 * Cart and other non-PDP callers: “Style it with” only (no similar-products link).
 *
 * Today this is an alias of {@link PdpCrossLinksBaseOptions}. When you need cart-only
 * knobs, change this to an `interface` that `extends PdpCrossLinksBaseOptions` and add
 * optional or required members there — {@link PdpSectionOptions} stays unchanged.
 */
export type StyleItWithCrossLinksOptions = PdpCrossLinksBaseOptions

/**
 * Cross-link style section entry — mirrors the crossLinks pattern used elsewhere.
 *
 * `title`  — human-readable label for the section
 * `url`    — fully built PLP API URL; pass directly as the request URL
 *
 * @example
 *   fetch(`/api${related_products.url}`)
 */
export interface PdpCrossLink {
  id: string
  title: string
  url: string
}

/** Shape merged into the PDP response */
export interface PdpSectionResults {
  crossLinks: PdpCrossLink[]
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type ProductCategoryAttribute = {
  name?: string
  value?: string
}

type ProductCategory = {
  name?: string
  attributes?: ProductCategoryAttribute[]
}

type ProductAttributeValue = {
  name?: string
  value?: string
  attribute?: {
    name?: string
  }
}

type RelatedProductInput = {
  categories?: ProductCategory[]
  attribute_values?: ProductAttributeValue[]
  filters?: {
    gender?: string[]
    category?: string[]
    style?: string[]
    fashion_type?: string[]
  }
  metadata?: {
    gender?: string
    style?: string
  }
}

/**
 * Build the PLP URL for "Style it with" products.
 * Category values are comma-joined into a single `category` param
 * (matches how /store/v2/productlist forwards filters to YesPlz).
 *
 * Note: location is intentionally NOT included in the URL.
 * Frontend supplies location query params when calling PLP.
 */
function buildRelatedProductsUrl(
  gender: string,
  categories: string[],
  limit: number
): string {
  const params = new URLSearchParams()
  params.set('gender', gender)
  params.set('category', categories.join(','))
  params.set('sort', 'recommended')
  params.set('limit', String(limit))

  return `${STORE_V2_PRODUCTLIST_PATH}?${params.toString()}`
}

/**
 * Build the PLP URL for "Similar products".
 *
 * Note: location is intentionally NOT included in the URL.
 * Frontend supplies location query params when calling PLP.
 */
function buildSimilarProductsUrl(
  gender: string,
  category: string,
  limit: number
): string {
  const params = new URLSearchParams()
  params.set('gender', gender)
  params.set('category', category)
  params.set('sort', 'recommended')
  params.set('limit', String(limit))

  return `${STORE_V2_PRODUCTLIST_PATH}?${params.toString()}`
}

// ─── Section builder ──────────────────────────────────────────────────────────

function buildRelatedProductsSection(
  product: RelatedProductInput,
  limit: number
): PdpCrossLink | null {
  const gender = extractGenderFromProduct(product)
  if (!gender) return null

  const categories = getComplementaryCategories(product)
  if (categories.length === 0) return null

  return {
    id: 'style_it_with',
    title: 'Style it with',
    url: buildRelatedProductsUrl(gender, categories, limit),
  }
}

function buildSimilarProductsSection(
  product: RelatedProductInput,
  limit: number
): PdpCrossLink | null {
  const gender = extractGenderFromProduct(product)
  if (!gender) return null

  const category = getMainCategoryName(product)
  if (!category) return null

  return {
    id: 'similar',
    title: 'Similar products',
    url: buildSimilarProductsUrl(gender, category, limit),
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * PDP only: "Style it with" + "Similar products" cross-links.
 * For cart responses use {@link fetchStyleItWithCrossLinks} instead.
 */
export async function fetchPdpCrossLinks(
  product: RelatedProductInput,
  options: PdpSectionOptions
): Promise<PdpSectionResults> {
  const relatedLink = buildRelatedProductsSection(product, options.relatedLimit)
  const similarLink = buildSimilarProductsSection(product, options.similarLimit)
  return {
    crossLinks: [relatedLink, similarLink].filter(Boolean) as PdpCrossLink[],
  }
}

/**
 * Cart and other non-PDP callers: only the "Style it with" link (same PLP URL rules as PDP).
 */
export async function fetchStyleItWithCrossLinks(
  product: RelatedProductInput,
  options: StyleItWithCrossLinksOptions
): Promise<PdpSectionResults> {
  const relatedLink = buildRelatedProductsSection(product, options.relatedLimit)
  return {
    crossLinks: [relatedLink].filter(Boolean) as PdpCrossLink[],
  }
}
