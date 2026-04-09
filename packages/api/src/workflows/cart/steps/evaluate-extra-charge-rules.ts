import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { EXTRA_CHARGE_MODULE } from '../../../modules/extra-charge'
import ExtraChargeService from '../../../modules/extra-charge/service'

export const evaluateExtraChargeRulesStep = createStep(
  'evaluate-extra-charge-rules',
  async (context: any, { container }) => {
    const service = container.resolve<ExtraChargeService>(EXTRA_CHARGE_MODULE)

    // Evaluate rules and get applicable charges
    const applicableCharges = await service.evaluateRules(context)

    // Add metadata about applied rules for tracking
    const chargesWithMetadata = applicableCharges.map(charge => ({
      ...charge,
      applied_rules: `Rule evaluation applied for cart ${context.cart.id}`
    }))

    return new StepResponse(chargesWithMetadata)
  }
)
