"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMiddleware = void 0;
// Custom middleware to handle search functionality for controls
const searchMiddleware = (req, res, next) => {
    // Handle search functionality
    const filters = { ...req.filterableFields };
    // If search query exists, add text search filters
    if (filters.q) {
        const searchTerm = String(filters.q);
        delete filters.q; // Remove q from filters as it's not a direct field
        // Add search filters for text fields
        filters.$or = [
            { scope_id: { $ilike: `%${searchTerm}%` } },
            { scope: { $ilike: `%${searchTerm}%` } },
            { delay_message: { $ilike: `%${searchTerm}%` } },
        ];
        // Handle numeric search for delay_seconds
        const numericSearchTerm = parseInt(searchTerm, 10);
        if (!isNaN(numericSearchTerm)) {
            filters.$or.push({ delay_minutes: numericSearchTerm });
        }
        // Update the filterable fields with our custom filters
        req.filterableFields = filters;
    }
    next();
};
exports.searchMiddleware = searchMiddleware;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLm1pZGRsZXdhcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2NvbnRyb2xzL3NlYXJjaC5taWRkbGV3YXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLGdFQUFnRTtBQUN6RCxNQUFNLGdCQUFnQixHQUFHLENBQUMsR0FBK0IsRUFBRSxHQUFtQixFQUFFLElBQWdCLEVBQUUsRUFBRTtJQUN6Ryw4QkFBOEI7SUFDOUIsTUFBTSxPQUFPLEdBQTRCLEVBQUUsR0FBRyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtJQUVwRSxrREFBa0Q7SUFDbEQsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDZCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQSxDQUFDLG1EQUFtRDtRQUVwRSxxQ0FBcUM7UUFDckMsT0FBTyxDQUFDLEdBQUcsR0FBRztZQUNaLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksVUFBVSxHQUFHLEVBQUUsRUFBRTtZQUMzQyxFQUFFLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLFVBQVUsR0FBRyxFQUFFLEVBQUU7WUFDeEMsRUFBRSxhQUFhLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxVQUFVLEdBQUcsRUFBRSxFQUFFO1NBQ2pELENBQUE7UUFFRCwwQ0FBMEM7UUFDMUMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQzdCLE9BQU8sQ0FBQyxHQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQUNuRSxDQUFDO1FBRUQsdURBQXVEO1FBQ3ZELEdBQUcsQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUE7SUFDaEMsQ0FBQztJQUVELElBQUksRUFBRSxDQUFBO0FBQ1IsQ0FBQyxDQUFBO0FBM0JZLFFBQUEsZ0JBQWdCLG9CQTJCNUIifQ==