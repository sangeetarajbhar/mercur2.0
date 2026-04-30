import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { fetchZoneByPincode, ZoneData } from '../../delivery-promise/steps/cart-promise/fetch-zone-by-pincode'

export type FetchZoneByPincodeStepInput = {
  postal_code: string
}

export const fetchZoneByPincodeStep = createStep(
  'fetch-zone-by-pincode',
  async (input: FetchZoneByPincodeStepInput, { container }): Promise<StepResponse<ZoneData | null>> => {
    const zone = await fetchZoneByPincode(input.postal_code)
    return new StepResponse(zone)
  }
)
