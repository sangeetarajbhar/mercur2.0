// import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
// import { CONFIGURATION_MODULE, ConfigurationModuleService } from "@mercurjs/configuration"
// import { ConfigurationRuleType } from "../../../admin/routes/configuration/types"

// export const checkRuleFlagStep = createStep(
//   "check-rule-flag-step",
//   async ( ruleType: ConfigurationRuleType, { container }) => {
//     const configuration: ConfigurationModuleService = container.resolve(CONFIGURATION_MODULE)
//     const isEnabled = await configuration.isRuleEnabled(ruleType)
//     return new StepResponse(isEnabled)
//   }
// )