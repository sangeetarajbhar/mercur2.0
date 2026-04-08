import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'

// Custom middleware to handle search functionality for controls
export const searchMiddleware = (req: AuthenticatedMedusaRequest, res: MedusaResponse, next: () => void) => {
  // Handle search functionality
  const filters: Record<string, unknown> = { ...req.filterableFields }
  
  // If search query exists, add text search filters
  if (filters.q) {
    const searchTerm = String(filters.q)
    delete filters.q // Remove q from filters as it's not a direct field
    
    // Add search filters for text fields
    filters.$or = [
      { scope_id: { $ilike: `%${searchTerm}%` } },
      { scope: { $ilike: `%${searchTerm}%` } },
      { delay_message: { $ilike: `%${searchTerm}%` } },
    ]
    
    // Handle numeric search for delay_seconds
    const numericSearchTerm = parseInt(searchTerm, 10)
    if (!isNaN(numericSearchTerm)) {
      (filters.$or as any[]).push({ delay_minutes: numericSearchTerm })
    }
    
    // Update the filterable fields with our custom filters
    req.filterableFields = filters
  }
  
  next()
}
