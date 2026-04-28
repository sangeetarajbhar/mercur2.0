import axios from 'axios'
import { ANALYTICS_CUSTOMER_URL, ANALYTICS_AUTH_HEADER } from './constants'

const ANALYTICS_TIMEOUT_MS = 10_000

export type CustomerAnalyticsPayload = {
  userId: string
  context: {
    traits: {
      userId: string
      email?: string
      phone?: string
      mobile?: string
      first_name?: string
      last_name?: string
      gender?: string
      user_first_order_date?: string
      user_last_purchase_date?: string
    }
    library: {
      name: string
    }
  }
  timestamp: string
}

/**
 * Sends a customer analytics payload to the configured analytics endpoint.
 * Does not throw; logs errors and returns so the caller can complete.
 */
export async function sendCustomerAnalytics(
  payload: CustomerAnalyticsPayload,
  logContext: string = 'analytics-customer'
): Promise<void> {
  if (!ANALYTICS_CUSTOMER_URL || !ANALYTICS_AUTH_HEADER) {
    console.error(
      `[${logContext}] Analytics configuration missing: ANALYTICS_CUSTOMER_URL and ANALYTICS_AUTH_HEADER must be set`
    )
    return
  }

  try {
    await axios.post(ANALYTICS_CUSTOMER_URL, payload, {
      headers: {
        Authorization: ANALYTICS_AUTH_HEADER,
        'Content-Type': 'application/json'
      },
      timeout: ANALYTICS_TIMEOUT_MS
    })
  } catch (error) {
    const axiosError = error as { response?: { status?: number }; message?: string }
    console.error(
      `[${logContext}] Failed to send customer analytics:`,
      axiosError?.response?.status,
      axiosError?.message
    )
  }
}
