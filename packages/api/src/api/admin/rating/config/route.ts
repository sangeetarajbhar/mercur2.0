import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { SYSTEM_CONFIG_SECTION_MODULE } from "../../../../modules/system-config"
import SystemConfigModuleService from "../../../../modules/system-config/service"
import { getRatingEnabled, setRatingEnabled } from "../../../../utils/rating/is-rating-enabled"
import { APP_RATING_PROMPT_ENABLED_KEY } from "../../../../utils/constants/rating"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const systemConfigService = req.scope.resolve(
    SYSTEM_CONFIG_SECTION_MODULE
  ) as SystemConfigModuleService

  const enabled = await getRatingEnabled(systemConfigService)
  res.json({ key: APP_RATING_PROMPT_ENABLED_KEY, enabled })
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const systemConfigService = req.scope.resolve(
    SYSTEM_CONFIG_SECTION_MODULE
  ) as SystemConfigModuleService

  const { enabled } = req.validatedBody as { enabled: boolean }

  const config = await setRatingEnabled(systemConfigService, enabled)
  res.json({ key: APP_RATING_PROMPT_ENABLED_KEY, enabled, config })
}
