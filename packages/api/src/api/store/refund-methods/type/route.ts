import CustomCacheModuleService from "#/modules/cache/service";
import { container } from "@medusajs/framework";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { SYSTEM_CONFIG_SECTION_MODULE } from "../../../../modules/system-config";
import SystemConfigModuleService from "../../../../modules/system-config/service";
import { CodReturnType } from '../../../../utils/constants/bank_account_verification'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
  const systemConfigService = req.scope.resolve(SYSTEM_CONFIG_SECTION_MODULE) as SystemConfigModuleService;

  const cacheKey = "return-refund-method:upi-bank"

  const systemConfigReturnRefundMethodTypeCache = await cacheService.get(cacheKey);

  if (systemConfigReturnRefundMethodTypeCache) {
    return res.json({ systemsConfig: systemConfigReturnRefundMethodTypeCache })
  }

  // fetch only UPI and Bank records config
  const [systemsConfig] = await systemConfigService.listSystemConfigs({
      key: CodReturnType.COD_RETURN,
      deleted_at: null,
    },
    {
      select: ["id", "key", "value"]
    }
  );

  const methods = systemsConfig?.value ? JSON.parse(systemsConfig.value) : []
  const enabled = methods.filter((m: any) => m.value === "true")

  await cacheService.setPermanent(cacheKey, enabled)

  return res.json({ systemsConfig: enabled });
}
