import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CreateSystemConfigInput } from "../../system-config/type/mutation"
import { SYSTEM_CONFIG_SECTION_MODULE } from "../../../modules/system-config"
import SystemConfigModuleService from "../../../modules/system-config/service"

export const createSystemConfigStep = createStep(
  "create-system-config-step",
  async (input: CreateSystemConfigInput, { container }) => {
    const systemConfigModuleService: SystemConfigModuleService =
      container.resolve(SYSTEM_CONFIG_SECTION_MODULE)
    const systemConfig = await systemConfigModuleService.createSystemConfigs(input as any)

    return new StepResponse(systemConfig, (systemConfig as any).id)
  },
  async (id: string, { container }) => {
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "System config ID is required for compensation"
      )
    }

    const systemConfigModuleService: SystemConfigModuleService =
      container.resolve(SYSTEM_CONFIG_SECTION_MODULE)

    await systemConfigModuleService.softDeleteSystemConfigs(id as any)
  }
)

