// Use environment variable for tracking URL with fallback to production URL
export const ORDER_TRACKING_URL = process.env.STORE_URL

// BCC email for order notifications (supports comma-separated multiple emails)
export const BCC_ORDER_EMAILS: string[] = process.env.BCC_ORDER_EMAIL 
  ? process.env.BCC_ORDER_EMAIL.split(',').map(email => email.trim()).filter(Boolean)
  : []

// Analytics API configuration
export const ANALYTICS_ORDER_URL = process.env.ANALYTICS_ORDER_URL 
export const ANALYTICS_AUTH_HEADER = process.env.ANALYTICS_AUTH_HEADER
export const ANALYTICS_CUSTOMER_URL = process.env.ANALYTICS_CUSTOMER_URL

// Frappe API (hisab integration) – base URL from env, paths in code
export const FRAPPE_BASE_URL = process.env.FRAPPE_BASE_URL
export const FRAPPE_ORDER_AUTH_TOKEN = process.env.FRAPPE_ORDER_AUTH_TOKEN
/** Path for Frappe order create (used with FRAPPE_BASE_URL) */
export const FRAPPE_ORDER_CREATE_PATH = '/api/method/frappe_zilo.integrations.order.create'

/** Sales Invoice resource path (used with FRAPPE_BASE_URL) */
export const FRAPPE_SALES_INVOICE_RESOURCE_PATH = '/api/resource/Sales%20Invoice'
/** PDF download method path (used with FRAPPE_BASE_URL) */
export const FRAPPE_PDF_DOWNLOAD_PATH =
  '/api/method/frappe.utils.print_format.download_pdf'
/** Query string for invoice PDF format */
export const FRAPPE_PDF_QUERY =
  'doctype=Sales%20Invoice&format=Zilo%20Tax%20Invoice&letterhead=None&no_letterhead=1'
