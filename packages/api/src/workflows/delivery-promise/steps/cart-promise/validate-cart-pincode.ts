/**
 * Validates cart pincode against the provided postal code
 * @param cart - Cart object with shipping address
 * @param postal_code - Postal code from request parameter (optional)
 * @returns Validated pincode string
 * @throws Error if validation fails
 */
export function validateCartPincode(cart: any, postal_code?: string): string {
  const pincode = cart.shipping_address?.postal_code

  // Validate pincode exists and is a string
  if (!pincode || typeof pincode !== 'string') {
    throw new Error('MISSING_PINCODE')
  }

  // If postal_code is provided, validate it matches shipping address
  // If not provided, just use cart's shipping address postal_code
  if (postal_code && pincode !== postal_code) {
    throw new Error('PINCODE_DOES_NOT_MATCH')
  }

  return pincode
}

