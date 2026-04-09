import { Knex } from 'knex'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import {  MedusaContainer } from '@medusajs/framework'
import { calculateDeliveryPromiseFromZone, DeliveryPromiseResult, DeliveryPromiseErrorResult, fetchZoneByPincode } from '../steps'

export type GetHomePromiseInput = {
  scope: MedusaContainer
  pincode: string
}

export { DeliveryPromiseResult, DeliveryPromiseErrorResult }

export async function getHomePromise({ scope, pincode }: GetHomePromiseInput): Promise<DeliveryPromiseErrorResult | DeliveryPromiseResult> {
  const knex = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex

  try {
    // 1) Find zone by postcode
    const zone = await fetchZoneByPincode(pincode, knex)

    if (!zone) {
      return { 
        status: false, 
        message: 'Area is not serviceable', 
        error: 'NON_SERVICEABLE_AREA' 
      }
    }

    // 2) Use reusable step to calculate delivery promise
    return await calculateDeliveryPromiseFromZone({
      scope,
      zone_id: zone.id,
      location_id: zone.location_id
    })

  } catch {
    return { 
      status: false, 
      message: 'Failed to compute delivery promise', 
      error: 'COMPUTE_FAILED' 
    }
  }
}
