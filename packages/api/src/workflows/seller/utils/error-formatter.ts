import { ZodError } from 'zod'
import { MedusaError } from '@medusajs/framework/utils'

/**
 * Error categories for price list import
 */
export type ErrorCategory = 'date_range' | 'price' | 'sku' | 'validation' | 'general'

/**
 * Structured error format
 */
export interface StructuredError {
  field?: string
  code: string
  message: string
  severity: 'error' | 'critical'
  category?: ErrorCategory
}

/**
 * Format ZodError into readable message string
 */
export function formatZodError(zodError: ZodError): string {
  const errorMessages = zodError.issues.map((issue) => {
    const path = issue.path && issue.path.length > 0 ? issue.path.join('.') : 'general'
    return `${path}: ${issue.message}`
  })
  return errorMessages.join('; ')
}

/**
 * Categorize error based on message content
 */
export function categorizeError(error: Error | string): { category: ErrorCategory; details: string } {
  const message = typeof error === 'string' ? error : error.message
  const lowerMessage = message.toLowerCase()

  // Date range errors
  if (
    lowerMessage.includes('date') ||
    lowerMessage.includes('start') ||
    lowerMessage.includes('end') ||
    lowerMessage.includes('past') ||
    lowerMessage.includes('future') ||
    lowerMessage.includes('cannot be in the past') ||
    lowerMessage.includes('must be after') ||
    lowerMessage.includes('exceed') ||
    lowerMessage.includes('same')
  ) {
    return { category: 'date_range', details: message }
  }

  // Price errors
  if (
    lowerMessage.includes('amount') ||
    lowerMessage.includes('price') ||
    lowerMessage.includes('negative') ||
    lowerMessage.includes('discount') ||
    lowerMessage.includes('percentage') ||
    lowerMessage.includes('greater than') ||
    lowerMessage.includes('must be between')
  ) {
    return { category: 'price', details: message }
  }

  // SKU errors
  if (
    lowerMessage.includes('sku') ||
    lowerMessage.includes('variant') ||
    lowerMessage.includes('mapping') ||
    lowerMessage.includes('not found') ||
    lowerMessage.includes('belong to seller') ||
    lowerMessage.includes('price set')
  ) {
    return { category: 'sku', details: message }
  }

  // Validation errors (general schema validation)
  if (
    lowerMessage.includes('validation') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('must be')
  ) {
    return { category: 'validation', details: message }
  }

  // Default to general
  return { category: 'general', details: message }
}

/**
 * Parse any error to structured format
 */
export function parseErrorToStructured(error: unknown): {
  errors: StructuredError[]
  message: string
  category: ErrorCategory
} {
  let errorMessage = 'Price list import validation failed'
  const formattedErrors: StructuredError[] = []

  if (error instanceof MedusaError) {
    errorMessage = error.message
    const { category } = categorizeError(error)

    // Parse error message to extract structured errors if it contains ZodError format
    if (error.message.includes('Invalid price list data:')) {
      const errorParts = error.message.split('Invalid price list data:')
      if (errorParts.length > 1) {
        const actualError = errorParts[1].trim()
        // Split by semicolon to get individual errors
        const individualErrors = actualError.split(';').map((e) => e.trim()).filter(Boolean)

        individualErrors.forEach((err) => {
          const { category: errCategory } = categorizeError(err)
          // Parse format: "path: message" or just "message"
          const colonIndex = err.indexOf(':')
          if (colonIndex > 0) {
            const field = err.substring(0, colonIndex).trim()
            const message = err.substring(colonIndex + 1).trim()
            formattedErrors.push({
              field: field !== 'general' ? field : undefined,
              code: 'VALIDATION_ERROR',
              message: message,
              severity: 'error',
              category: errCategory
            })
          } else {
            formattedErrors.push({
              code: 'VALIDATION_ERROR',
              message: err,
              severity: 'error',
              category: errCategory
            })
          }
        })
      }
    } else {
      // Single error message
      formattedErrors.push({
        code: error.code || 'VALIDATION_ERROR',
        message: error.message,
        severity: 'error',
        category
      })
    }

    return { errors: formattedErrors, message: errorMessage, category }
  } else if (error instanceof ZodError) {
    const formattedMessage = formatZodError(error)
    const { category } = categorizeError(formattedMessage)
    
    const errors = error.issues.map((issue) => {
      const path = issue.path && issue.path.length > 0 ? issue.path.join('.') : undefined
      return {
        field: path,
        code: 'VALIDATION_ERROR',
        message: issue.message,
        severity: 'error' as const,
        category
      }
    })

    return { errors, message: formattedMessage, category }
  } else {
    // Handle non-Error objects - extract meaningful message
    if (error instanceof Error) {
      errorMessage = error.message || 'Unknown error occurred'
    } else if (typeof error === 'object' && error !== null) {
      // Try to extract message from error object
      const errorObj = error as Record<string, unknown>
      if (typeof errorObj.message === 'string') {
        errorMessage = errorObj.message
      } else if (typeof errorObj.error === 'string') {
        errorMessage = errorObj.error
      } else if (typeof errorObj.details === 'string') {
        errorMessage = errorObj.details
      } else {
        // Fallback: try JSON stringify for objects, but limit length
        try {
          const jsonStr = JSON.stringify(errorObj)
          errorMessage = jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr
        } catch {
          errorMessage = 'Unknown error occurred'
        }
      }
    } else {
      errorMessage = String(error) || 'Unknown error occurred'
    }
    
    const { category } = categorizeError(errorMessage)
    
    formattedErrors.push({
      code: 'VALIDATION_ERROR',
      message: errorMessage,
      severity: 'error',
      category
    })

    return { errors: formattedErrors, message: errorMessage, category }
  }
}

/**
 * Get user-friendly error description based on category
 */
export function getErrorDescription(category: ErrorCategory, details: string | unknown): string {
  // Ensure details is always a string
  let detailsStr: string
  if (typeof details === 'string') {
    detailsStr = details
  } else if (details instanceof Error) {
    detailsStr = details.message || 'Unknown error'
  } else if (typeof details === 'object' && details !== null) {
    // Try to extract meaningful message from object
    const errorObj = details as Record<string, unknown>
    if (typeof errorObj.message === 'string') {
      detailsStr = errorObj.message
    } else if (typeof errorObj.error === 'string') {
      detailsStr = errorObj.error
    } else {
      // Fallback: JSON stringify with length limit
      try {
        const jsonStr = JSON.stringify(errorObj)
        detailsStr = jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr
      } catch {
        detailsStr = 'Unknown error occurred'
      }
    }
  } else {
    detailsStr = String(details) || 'Unknown error occurred'
  }

  switch (category) {
    case 'date_range':
      return `Date range validation failed: ${detailsStr}`
    case 'price':
      return `Invalid price values: ${detailsStr}`
    case 'sku':
      return `SKU mapping issues: ${detailsStr}`
    case 'validation':
      return `Validation failed: ${detailsStr}`
    default:
      return `Import failed: ${detailsStr}`
  }
}

