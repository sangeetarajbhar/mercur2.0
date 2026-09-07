/**
 * Replaces @mercurjs/admin's built-in stock location create route chunk so
 * /settings/locations/create always renders the app route implementation.
 */
import StockLocationCreateRoute from "../routes/settings/locations/create/page";

// Mercur lazy routes import chunks expecting a named `Component` export.
export const Component = StockLocationCreateRoute;
export default StockLocationCreateRoute;
