import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { TIER_MODULE } from "../modules/tier"
import TierModuleService from "../modules/tier/service"
import { TierAutoAssignConfig } from "../config/tier-auto-assign"

const LOG_PREFIX = "[auto-assign-customer-tiers]"
const BATCH_CONCURRENCY = 3

type TierLike = {
  id: string
  name: string
}

type LinkLike = {
  create: (payload: Record<string, unknown>) => Promise<unknown>
  dismiss: (payload: Record<string, unknown>) => Promise<unknown>
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function autoAssignCustomerTiersJob(container: MedusaContainer) {
  if (!TierAutoAssignConfig.enabled) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const lockingService = container.resolve(Modules.LOCKING)

  try {
    await lockingService.execute(
      TierAutoAssignConfig.lockKey,
      async () => {
        logger.info(`${LOG_PREFIX} Job started`)
        const stats = await runJob(container)
        logger.info(`${LOG_PREFIX} Job completed — ${JSON.stringify(stats)}`)
      },
      { timeout: TierAutoAssignConfig.lockTimeoutSec }
    )
  } catch (error) {
    logger.error(`${LOG_PREFIX} Job failed`, error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function runJob(container: MedusaContainer) {
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const link = container.resolve(ContainerRegistrationKeys.LINK) as LinkLike
  const tierService: TierModuleService = container.resolve(TIER_MODULE)

  const stats = {
    scanned: 0,
    assignedVip2: 0,
    assignedVip3: 0,
    removed: 0,
    errors: 0,
  }

  const tiers = await tierService.listTiers({})
  const vip2 = tiers.find((t) => t.name === TierAutoAssignConfig.tierNameVip2) as
    | TierLike
    | undefined
  const vip3 = tiers.find((t) => t.name === TierAutoAssignConfig.tierNameVip3) as
    | TierLike
    | undefined

  if (!vip2 || !vip3) return stats

  const lookbackTime = new Date(
    Date.now() - TierAutoAssignConfig.lookbackHours * 3600 * 1000
  )

  let lastCustomerId: string | null = null

  type InFlightResult = { id: number; stats: BatchStats }
  const inFlight: Array<{
    id: number
    promise: Promise<InFlightResult>
  }> = []

  let batchId = 0

  while (true) {
    const rows = await knex("order")
      .select("customer_id")
      .count({ total_orders: "*" })
      .whereNull("deleted_at")
      .andWhere("status", "=", "DELIVERED") // only include delivered orders
      .andWhere("updated_at", ">=", lookbackTime)
      .modify((qb: { andWhere: (col: string, op: string, val: string) => unknown }) => {
        if (lastCustomerId) {
          qb.andWhere("customer_id", ">", lastCustomerId)
        }
      })
      .groupBy("customer_id")
      .havingRaw("COUNT(*) <= 2") // only VIP candidates
      .orderBy("customer_id", "asc")
      .limit(TierAutoAssignConfig.batchSize)

    if (!rows.length) break

    const endCustomerId: string = rows[rows.length - 1].customer_id
    lastCustomerId = endCustomerId

    const id = ++batchId

    inFlight.push({
      id,
      promise: processBatch(rows, vip2, vip3, link).then((res) => ({
        id,
        stats: res,
      })),
    })

    if (inFlight.length >= BATCH_CONCURRENCY) {
      const finished = await Promise.race(inFlight.map((x) => x.promise))
      mergeStats(stats, finished.stats)

      const idx = inFlight.findIndex((x) => x.id === finished.id)
      if (idx >= 0) inFlight.splice(idx, 1)
    }
  }

  // drain remaining
  while (inFlight.length) {
    const finished = await Promise.race(inFlight.map((x) => x.promise))
    mergeStats(stats, finished.stats)

    const idx = inFlight.findIndex((x) => x.id === finished.id)
    if (idx >= 0) inFlight.splice(idx, 1)
  }

  return stats
}

// ─────────────────────────────────────────────────────────────────────────────

type BatchStats = {
  scanned: number
  assignedVip2: number
  assignedVip3: number
  removed: number
  errors: number
}

async function processBatch(
  rows: Array<{ customer_id: string; total_orders: number }>,
  vip2: TierLike,
  vip3: TierLike,
  link: LinkLike
) {
  const batchStats: BatchStats = {
    scanned: 0,
    assignedVip2: 0,
    assignedVip3: 0,
    removed: 0,
    errors: 0,
  }

  const startedAt = Date.now()
  void startedAt

  await Promise.allSettled(
    rows.map(async (row) => {
      const customerId = row.customer_id
      const count = Number(row.total_orders)

      batchStats.scanned++

      let target: string | null = null
      if (count === 1) target = vip2.id
      else if (count === 2) target = vip3.id

      try {
        await Promise.allSettled([
          link.dismiss({
            [TIER_MODULE]: { tier_id: vip2.id },
            [Modules.CUSTOMER]: { customer_id: customerId },
          }),
          link.dismiss({
            [TIER_MODULE]: { tier_id: vip3.id },
            [Modules.CUSTOMER]: { customer_id: customerId },
          }),
        ])

        if (target) {
          await link.create({
            [TIER_MODULE]: { tier_id: target },
            [Modules.CUSTOMER]: { customer_id: customerId },
          })

          if (target === vip2.id) batchStats.assignedVip2++
          else batchStats.assignedVip3++
        } else {
          batchStats.removed++
        }
      } catch {
        batchStats.errors++
      }
    })
  )

  return batchStats
}

// ─────────────────────────────────────────────────────────────────────────────

function mergeStats(target: BatchStats, source: BatchStats) {
  target.scanned += source.scanned
  target.assignedVip2 += source.assignedVip2
  target.assignedVip3 += source.assignedVip3
  target.removed += source.removed
  target.errors += source.errors
}

// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  name: "auto-assign-customer-tiers",
  schedule: TierAutoAssignConfig.schedule,
}