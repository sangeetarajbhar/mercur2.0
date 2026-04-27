type EnvBoolOptions = {
  defaultValue: boolean
}

const envBool = (key: string, options: EnvBoolOptions): boolean => {
  const raw = process.env[key]
  if (raw == null) return false

  const v = String(raw).trim().toLowerCase()
  if (v === "1" || v === "true" || v === "yes" || v === "y") return true
  if (v === "0" || v === "false" || v === "no" || v === "n") return false

  return options.defaultValue
}

export const TierAutoAssignConfig = {
  // Enable/disable the job
  // If env key is missing, do not run
  enabled: envBool("CRON_ENABLED_TIER_AUTO_ASSIGN", { defaultValue: false }),

  // Verbose logs (per-customer assignment)
  debugLogs: envBool("TIER_AUTO_ASSIGN_DEBUG_LOGS", { defaultValue: false }),

  // Cron schedule: default is 12:01 AM IST (18:31 UTC)
  schedule: process.env.CRON_SCHEDULE_TIER_AUTO_ASSIGN || "*/2 * * * *",

  // Tier names as stored in tier.name column
  tierNameVip2: process.env.TIER_NAME_VIP2 || "ZILOVIP2",
  tierNameVip3: process.env.TIER_NAME_VIP3 || "ZILOVIP3",

  // Incremental processing window and batching
  lookbackHours: Number(process.env.TIER_AUTO_ASSIGN_LOOKBACK_HOURS || 26),
  batchSize: Number(process.env.TIER_AUTO_ASSIGN_BATCH_SIZE || 50),

  // Locking to prevent concurrent runs
  lockKey: "auto-assign-customer-tiers",
  lockTimeoutSec: Number(process.env.TIER_AUTO_ASSIGN_LOCK_TIMEOUT_SEC || 60),
} as const

