import SystemConfigModuleService from "../../modules/system-config/service"
import { APP_RATING_PROMPT_ENABLED_KEY } from "../constants/rating"

/**
 * Reads the rating prompt kill-switch from system-config.
 * Defaults to `true` when no record exists (fail-open).
 */
export async function getRatingEnabled(
  systemConfigService: SystemConfigModuleService
): Promise<boolean> {
  const [config] = await systemConfigService.listSystemConfigs(
    { key: APP_RATING_PROMPT_ENABLED_KEY, deleted_at: null } as unknown as Record<string, unknown>,
    { select: ["id", "key", "value"] } as unknown as Record<string, unknown>
  )
  return config?.value === "false" ? false : true
}

/**
 * Upserts the rating prompt kill-switch in system-config.
 * Returns the persisted system-config record.
 */
export async function setRatingEnabled(
  systemConfigService: SystemConfigModuleService,
  enabled: boolean
): Promise<Record<string, unknown>> {
  const [existing] = await systemConfigService.listSystemConfigs(
    { key: APP_RATING_PROMPT_ENABLED_KEY, deleted_at: null } as unknown as Record<string, unknown>,
    { select: ["id"] } as unknown as Record<string, unknown>
  )

  const value = enabled ? "true" : "false"

  if (existing?.id) {
    const [updated] = (await systemConfigService.updateSystemConfigs([
      { id: existing.id, value },
    ] as unknown as Record<string, unknown>[])) as Record<string, unknown>[]
    return updated
  }

  const [created] = (await systemConfigService.createSystemConfigs([
    { key: APP_RATING_PROMPT_ENABLED_KEY, value },
  ] as unknown as Record<string, unknown>[])) as Record<string, unknown>[]
  return created
}
