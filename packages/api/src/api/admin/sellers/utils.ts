import { ulid } from 'ulid'

/**
 * Structural type for the seller module service where the full class type
 * is not imported (e.g. from `@mercurjs/core`). Only methods used in
 * this module are declared.
 */
export type SellerModuleService = {
  listSellers: (filters: { barcode: string }) => Promise<readonly unknown[]>
}

export function generatePassword(name: string, phone: string): string {
    const digitsOnly = phone.replace(/\D/g, "")
    if (digitsOnly.length < 4) {
      throw new Error("Please mention valid phone number.")
    }
  
    const nameSanitized = name.trim()
    if (nameSanitized.length === 0) {
      throw new Error("Name cannot be empty.")
    }
  
    // Capitalize first letter, leave rest as-is
    const capitalizedName = nameSanitized[0].toUpperCase() + nameSanitized.slice(1)
    const namePart = capitalizedName.slice(0, 3)
    const phonePart = digitsOnly.slice(-4)
  
    return `${namePart}@${phonePart}`
  }

/**
 * Extract path from URL (removes base URL, keeps only path)
 * @param url - Full URL or path string
 * @returns Path portion of the URL
 */
export const extractUrlPath = (url: string | null | undefined): string => {
  if (!url) return ''
  
  try {
    // If it's already a path (starts with /), return as is
    if (url.startsWith('/')) {
      return url
    }
    
    // If it's a full URL, extract the path
    const urlObj = new URL(url)
    return urlObj.pathname
  } catch (error) {
    // If URL parsing fails, assume it's already a path and return as is
    return url.startsWith('/') ? url : `/${url}`
  }
}

/**
 * Generate a unique barcode for a seller
 * Format: Entire first keyword (word) from name (uppercase) + ULID random portion (last 10 chars)
 * Example: "Acme Corp" -> "ACMERRFFQ69G5FAV" (first word "Acme" -> entire word "ACME" + 10 ULID chars)
 * ULID format: 26 characters (timestamp + randomness)
 * We use the last 10 characters (random portion) to keep barcode length reasonable
 */
export const generateUniqueBarcode = async (name: string, service: SellerModuleService): Promise<string> => {
  // Validate name input
  if (!name || typeof name !== 'string' || name.trim() === '') {
    // Fallback: use "SELLER" as prefix if name is invalid
    const prefix = 'SELLER'
    const ulidString = ulid()
    const randomPortion = ulidString.slice(-10)
    return `${prefix}${randomPortion}`
  }

  // Extract first keyword (word) from name
  const firstWord = name.trim().split(/\s+/)[0];
  // Remove special characters and convert to uppercase - use entire word
  let prefix = firstWord.replace(/[^a-zA-Z]/g, '').toUpperCase();
  
  // If prefix is empty after cleaning, use fallback
  if (!prefix || prefix.length === 0) {
    prefix = 'SELLER'
  }
  
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    // Generate ULID and extract the random portion (last 10 characters)
    const ulidString = ulid()
    const randomPortion = ulidString.slice(-10) // Get last 10 characters (random part)
    const barcode = `${prefix}${randomPortion}`
    
    // Check if barcode already exists
    const existingSellers = await service.listSellers({ barcode })
    
    if (existingSellers.length === 0) {
      return barcode
    }
    
    attempts++
  }
  
  // Fallback: use ULID random portion if all attempts fail
  const fallbackUlid = ulid()
  const fallbackRandom = fallbackUlid.slice(-10)
  return `${prefix}${fallbackRandom}`
}