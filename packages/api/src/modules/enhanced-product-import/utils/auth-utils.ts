import { ValidationError } from "../types"

export function validateSellerId(sellerId: string): ValidationError | null {
  if (!sellerId || sellerId.trim() === '') {
    return {
      row: 0,
      field: 'seller_id',
      message: 'Seller ID is required for authorization',
      value: sellerId
    }
  }

  // Basic seller ID format validation (assuming Medusa ID format)
  if (!sellerId.match(/^[a-zA-Z0-9_-]+$/)) {
    return {
      row: 0,
      field: 'seller_id',
      message: 'Invalid seller ID format',
      value: sellerId
    }
  }

  return null
}

export function createAuthorizationError(
  row: number,
  resourceType: 'brand' | 'product',
  resourceIdentifier: string,
  action: 'access' | 'update'
): ValidationError {
  const actionText = action === 'access' ? 'access to' : 'update'
  return {
    row,
    field: resourceType,
    message: `Unauthorized ${actionText} ${resourceType}: ${resourceIdentifier}`,
    value: resourceIdentifier
  }
}

export function validateBrandHandles(brandHandles: string[]): ValidationError[] {
  const errors: ValidationError[] = []

  brandHandles.forEach((handle, index) => {
    if (!handle || handle.trim() === '') {
      errors.push({
        row: index + 1,
        field: 'brand',
        message: 'Brand handle cannot be empty',
        value: handle
      })
      return
    }

    // Brand handle should be lowercase with hyphens
    if (!handle.match(/^[a-z0-9-]+$/)) {
      errors.push({
        row: index + 1,
        field: 'brand',
        message: 'Brand handle must contain only lowercase letters, numbers, and hyphens',
        value: handle
      })
    }
  })

  return errors
}

export function validateProductIds(productIds: string[]): ValidationError[] {
  const errors: ValidationError[] = []

  productIds.forEach((id, index) => {
    if (!id || id.trim() === '') {
      errors.push({
        row: index + 1,
        field: 'id',
        message: 'Product ID cannot be empty',
        value: id
      })
      return
    }

    // Basic product ID format validation
    if (!id.match(/^[a-zA-Z0-9_-]+$/)) {
      errors.push({
        row: index + 1,
        field: 'id',
        message: 'Invalid product ID format',
        value: id
      })
    }
  })

  return errors
}

export function aggregateAuthorizationErrors(
  brandErrors: ValidationError[],
  productErrors: ValidationError[]
): ValidationError[] {
  return [...brandErrors, ...productErrors].sort((a, b) => a.row - b.row)
}

export function formatAuthorizationSummary(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'All authorization checks passed'
  }

  const brandErrors = errors.filter(e => e.field === 'brand')
  const productErrors = errors.filter(e => e.field === 'id')

  const summary: string[] = []

  if (brandErrors.length > 0) {
    const unauthorizedBrands = [...new Set(brandErrors.map(e => e.value))]
    summary.push(`Unauthorized brands: ${unauthorizedBrands.join(', ')}`)
  }

  if (productErrors.length > 0) {
    const unauthorizedProducts = [...new Set(productErrors.map(e => e.value))]
    summary.push(`Unauthorized product updates: ${unauthorizedProducts.join(', ')}`)
  }

  return summary.join('; ')
}