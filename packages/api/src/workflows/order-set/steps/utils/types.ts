/**
 * Type definitions for order-set export filters
 */

export interface OrderSetExportFilters {
  created_at?: Record<string, string> | string
  updated_at?: Record<string, string> | string
  status?: string[] | string
  delivery_type?: string[] | string
  q?: string
  order?: string | Record<string, string>
}

