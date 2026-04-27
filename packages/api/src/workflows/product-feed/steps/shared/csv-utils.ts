/**
 * Shared CSV utility functions
 * Single Responsibility: CSV formatting utilities used across feed generation
 */

export const escapeCsvValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return ""
  }
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
