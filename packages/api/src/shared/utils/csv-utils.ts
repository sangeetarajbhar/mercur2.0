/**
 * Shared CSV utility functions
 * Used across all CSV export workflows for consistent CSV field escaping
 */

/**
 * Escapes a CSV field value according to RFC 4180
 * Wraps fields containing commas, newlines, or quotes in double quotes
 * and escapes internal double quotes by doubling them
 * 
 * @param field - The field value to escape (string, number, boolean, null, or undefined)
 * @returns Properly escaped CSV field string
 */
export const escapeCSVField = (
  field: string | number | boolean | null | undefined
): string => {
  const fieldStr = field === null || field === undefined ? '' : String(field)

  if (
    fieldStr.includes(',') ||
    fieldStr.includes('\n') ||
    fieldStr.includes('\r') ||
    fieldStr.includes('"')
  ) {
    return `"${fieldStr.replace(/"/g, '""')}"`
  }

  return fieldStr
}

