/**
 * Account Validation Webhook Events
 *
 * Used for Razorpay fund_account.validation.completed and fund_account.validation.failed
 * webhooks. The API receives the webhook, validates the signature, and emits this event
 * for async processing by the subscriber.
 */
export const AccountValidationEvents = {
  /**
   * Emitted when an account validation webhook is received and signature is valid.
   * Payload: { provider, payload: { data: req.body, rawData: req.rawBody, headers } }
   */
  WEBHOOK_RECEIVED: 'account_validation.webhook.received',
} as const

export type AccountValidationEventType =
  (typeof AccountValidationEvents)[keyof typeof AccountValidationEvents]
