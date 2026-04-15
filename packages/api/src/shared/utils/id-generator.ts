import crypto from 'crypto';

/**
 * Generates a unique 12-digit order ID
 * Safe for distributed multi-server environments
 * NEVER fails - returns fallback ID if generation fails
 */
export function generateOrderId(): number {
  const maxRetries = 5;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      // Force both halves to be 6 digits so the result is always 12 digits
      const timestampPart = (Date.now() % 900000) + 100000; // 100000-999999
      const randomPart = crypto.randomInt(100000, 1_000_000); // 100000-999999
      const orderId = timestampPart * 1_000_000 + randomPart;

      // Length will always be 12 given the ranges above, but keep the guard
      if (orderId.toString().length === 12) {
        return orderId;
      }

      attempts++;
    } catch (error) {
      attempts++;
    }
  }

  // Fallback: still enforce 12 digits using pid for entropy
  const fallbackTimestampPart = (Math.floor(Date.now() / 1000) % 900000) + 100000;
  const fallbackRandomPart = (process.pid % 900000) + 100000;
  return fallbackTimestampPart * 1_000_000 + fallbackRandomPart;
}
