import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// ---------------------------------------------------------------------------
// Constants: lock key and timing
// ---------------------------------------------------------------------------

/** Redis key prefix. Each order gets one lock: "receive-and-refund-lock:{orderId}" */
const LOCK_KEY_PREFIX = "receive-and-refund-lock:"

/**
 * How long (seconds) the Locking module will wait to acquire the lock in one attempt.
 * The Redis provider retries internally (e.g. every few ms) during this window.
 */
const ACQUIRE_TIMEOUT_SEC = Number(process.env.ACQUIRE_TIMEOUT_SEC ?? 45)

/**
 * If we hit the acquire timeout (another request still holds the lock), we retry.
 * This is the maximum total time we keep retrying before failing the request.
 */
const MAX_WAIT_MS = Number(process.env.MAX_WAIT_MS ?? 120_000) // 2 min

/** Delay between retry attempts after an acquire timeout (gives the other request time to finish). */
const RETRY_SLEEP_MS = Number(process.env.RETRY_SLEEP_MS ?? 2000)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pause for the given milliseconds (used between retries). */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Returns true if the error is a "could not acquire lock in time" style error.
 * The Locking module throws when timeout is reached; we use this to retry instead of failing.
 */
function isLockTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message?.toLowerCase() ?? ""
  // Retry only for lock-acquire timeout style errors.
  // Do NOT treat generic downstream timeouts (HTTP/DB/API) as lock timeouts.
  return (
    (msg.includes("lock") && msg.includes("timeout")) ||
    (msg.includes("lock") && msg.includes("timed out")) ||
    (msg.includes("acquire") && msg.includes("timed out")) ||
    (msg.includes("acquire") && msg.includes("timeout")) ||
    msg.includes("could not acquire lock") ||
    msg.includes("lock not acquired") ||
    msg.includes("not acquired lock")
  )
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface WithOrderReceiveLockOptions {
  /** Timeout in seconds for each acquire attempt (default 60). */
  acquireTimeoutSec?: number
  /** Max total ms to wait for the lock before throwing (default 2 min). */
  maxWaitMs?: number
}

/**
 * Runs the given async function while holding a per-order lock for receive-and-refund.
 *
 * Why this exists:
 * - Medusa allows only one active "order change" per order at a time.
 * - When you receive/refund one return, it creates/uses that order change.
 * - If a second return for the same order is processed at the same time,
 *   you get: "Order already has an existing active order change".
 *
 * This function uses Medusa's Locking Module (Redis-backed in your config) so that
 * only one receive-and-refund runs per order at a time, across all server instances.
 * A second request for the same order will wait until the first finishes, then run.
 *
 * Flow:
 * 1. Build lock key from orderId (e.g. "receive-and-refund-lock:order_01ABC...").
 * 2. Ask the Locking module to execute(fn) while holding that key.
 * 3. If the lock is free: we acquire it, run fn, release. Done.
 * 4. If the lock is held: the module waits up to acquireTimeoutSec to acquire it.
 * 5. If we still don't have it (timeout): we catch, check it's a timeout error,
 *    then sleep and retry from step 2, until maxWaitMs has passed (then we throw).
 *
 * @param scope - Medusa container (e.g. req.scope) used to resolve the Locking module.
 * @param orderId - Order ID; only one concurrent receive-and-refund per order.
 * @param fn - The async work to run (typically: run the receive-and-refund workflow).
 * @param options - Optional acquire timeout and max wait (see WithOrderReceiveLockOptions).
 * @returns The result of fn().
 */
export async function withOrderReceiveLock<T>(
  scope: MedusaContainer,
  orderId: string,
  fn: () => Promise<T>,
  options: WithOrderReceiveLockOptions = {}
): Promise<T> {
  const acquireTimeoutSec = options.acquireTimeoutSec ?? ACQUIRE_TIMEOUT_SEC
  const maxWaitMs = options.maxWaitMs ?? MAX_WAIT_MS
  const lockKey = `${LOCK_KEY_PREFIX}${orderId}`
  const lockingService = scope.resolve(Modules.LOCKING)
  const logger = scope.resolve(ContainerRegistrationKeys.LOGGER)
  const start = Date.now()
  let attempt = 0

  logger.info(
    `[receive-refund-lock] Acquiring lock, ${JSON.stringify({
      orderId,
      lockKey,
      acquireTimeoutSec,
      maxWaitMs,
    })}`
  )

  while (true) {
    attempt++
    const attemptStart = Date.now()
    let lockAcquiredThisAttempt = false
    logger.info(
      `[receive-refund-lock] Acquire attempt started, ${JSON.stringify({
        orderId,
        attempt,
        acquireTimeoutSec,
        maxWaitMs,
      })}`
    )

    try {
      // Try to acquire the lock and run fn. Lock is released when fn() completes (success or error).
      const result = await lockingService.execute(
        lockKey,
        async () => {
          lockAcquiredThisAttempt = true
          const workflowStart = Date.now()
          logger.info(
            `[receive-refund-lock] Lock acquired, running workflow, ${JSON.stringify({
              orderId,
              attempt,
              waitedMs: workflowStart - attemptStart,
              totalWaitedMs: workflowStart - start,
            })}`
          )
          try {
            return await fn()
          } finally {
            const workflowMs = Date.now() - workflowStart
            logger.info(
              `[receive-refund-lock] Workflow finished, releasing lock, ${JSON.stringify({
                orderId,
                workflowMs,
              })}`
            )
          }
        },
        { timeout: Math.max(1, acquireTimeoutSec) }
      )

      const totalMs = Date.now() - start
      logger.info(
        `[receive-refund-lock] Completed successfully, ${JSON.stringify({
          orderId,
          attempt,
          totalMs,
          totalSeconds: (totalMs / 1000).toFixed(2),
        })}`
      )
      return result
    } catch (error) {
      // If lock was already acquired in this attempt, this is a workflow/runtime
      // failure (not lock-acquire contention). Never retry full fn() in this case.
      if (lockAcquiredThisAttempt) {
        logger.error(
          `[receive-refund-lock] Error after lock acquired, not retrying, ${JSON.stringify({
            orderId,
            attempt,
            waitedMs: Date.now() - start,
            error: error instanceof Error ? error.message : String(error),
          })}`,
          error instanceof Error ? error : undefined
        )
        throw error
      }

      // Not a timeout (e.g. workflow error): rethrow so the caller sees the real error.
      if (!isLockTimeout(error)) {
        logger.error(
          `[receive-refund-lock] Non-timeout error, rethrowing, ${JSON.stringify({
            orderId,
            attempt,
            waitedMs: Date.now() - start,
            error: error instanceof Error ? error.message : String(error),
          })}`,
          error instanceof Error ? error : undefined
        )
        console.dir(error.message, { depth: null, colors: true })
        throw error
      }

      const waitedMs = Date.now() - start
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.warn(
        `[receive-refund-lock] Acquire timeout, will retry, ${JSON.stringify({
          orderId,
          attempt,
          acquireTimeoutSec,
          waitedMs,
          waitedSeconds: (waitedMs / 1000).toFixed(2),
          maxWaitMs,
          retrySleepMs: RETRY_SLEEP_MS,
          error: errorMessage,
        })}`
      )

      // We waited acquireTimeoutSec but another request still held the lock. Give up if we've exceeded max wait.
      if (waitedMs >= maxWaitMs) {
        logger.error(
          `[receive-refund-lock] Max wait exceeded, giving up, ${JSON.stringify({
            orderId,
            attempt,
            waitedMs,
            maxWaitMs,
          })}`
        )
        throw new Error(
          `Order receive lock not acquired for order ${orderId} within ${maxWaitMs}ms`
        )
      }

      // Wait a bit before retrying so the other request has time to finish and release the lock.
      await sleep(RETRY_SLEEP_MS)
    }
  }
}
