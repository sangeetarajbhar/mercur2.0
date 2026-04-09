import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { EXTRA_CHARGE_MODULE } from '../../../modules/extra-charge'
import ExtraChargeService from '../../../modules/extra-charge/service'

export const addExtraChargesToCartStep = createStep(
  'add-extra-charges-to-cart',
  async (cartId: string, { container }) => {
    const service = container.resolve<ExtraChargeService>(EXTRA_CHARGE_MODULE)
    const charges = await service.listExtraCharges({ status: 'active' })

    // Transform charges into line items
    const chargeLineItems = charges.map((charge) => ({
      title: charge.name,
      unit_price: charge.amount,
      quantity: 1,
      metadata: { extra_charge_id: charge.id, is_extra_charge: true }
    }))
    return new StepResponse(chargeLineItems)
  }
)
