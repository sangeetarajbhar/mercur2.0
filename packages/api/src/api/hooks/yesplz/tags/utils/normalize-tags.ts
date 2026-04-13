/**
 * Tag Normalization Utility
 * Normalizes tag values: lowercase, trim, deduplicate
 */

const MAX_TAG_LENGTH = 255 // Database VARCHAR limit

/**
 * Normalize a single tag value
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove empty strings
 * - Validate length (max 255 characters)
 */
export function normalizeTagValue(value: string): string | null {
  if (!value || typeof value !== 'string') {
    return null
  }

  // Trim and convert to lowercase
  const normalized = value.trim().toLowerCase()

  // Return null for empty strings after normalization
  if (normalized.length === 0) {
    return null
  }

  // Validate length - truncate if too long
  if (normalized.length > MAX_TAG_LENGTH) {
    return normalized.substring(0, MAX_TAG_LENGTH)
  }

  return normalized
}

/**
 * Normalize an array of tag values
 * - Normalize each tag
 * - Remove duplicates
 * - Filter out null/empty values
 */
export function normalizeTags(tags: (string | { value: string; metadata?: Record<string, unknown> })[]): string[] {
  if (!Array.isArray(tags) || tags.length === 0) {
    return []
  }

  const normalizedSet = new Set<string>()

  for (const tag of tags) {
    let tagValue: string

    // Handle both string and object formats
    if (typeof tag === 'string') {
      tagValue = tag
    } else if (tag && typeof tag === 'object' && 'value' in tag) {
      tagValue = tag.value
    } else {
      continue // Skip invalid tag formats
    }

    const normalized = normalizeTagValue(tagValue)
    if (normalized) {
      normalizedSet.add(normalized)
    }
  }

  return Array.from(normalizedSet)
}

