import { logger } from "@medusajs/framework/logger"

/**
 * Send a text message to a Slack webhook.
 */
export async function sendSlackNotification(text: string): Promise<void> {
  const env = process.env.NODE_ENV?.toLowerCase()
  if (env !== "production") {
    return
  }
  const webhookUrl = process.env.SLACK_WEBHOOK_URL_SLOT_OVERRIDES
  if (!webhookUrl?.trim()) {
    logger.warn("Slack notification skipped: no webhook URL configured")
    return
  }
  try {
    const res = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      logger.warn(`Slack webhook returned ${res.status}`)
    } else {
      logger.info("Slack notification sent successfully")
    }
  } catch (err) {
    logger.warn(`Failed to send Slack notification: ${err}`)
  }
}
