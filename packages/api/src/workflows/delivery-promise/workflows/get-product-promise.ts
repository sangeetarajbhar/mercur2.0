import { Knex } from 'knex'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework'
import { calculateDeliveryPromiseFromZone, DeliveryPromiseResult, DeliveryPromiseErrorResult, fetchZoneByPincode } from '../steps'

export type GetProductPromiseInput = {
  scope: MedusaContainer
  variantId: string
  pincode: string
  cluster_id: string,
  seller_id?: string | null
}

export { DeliveryPromiseResult, DeliveryPromiseErrorResult }

export async function getProductPromise({
  scope,
  variantId,
  pincode,
  cluster_id,
  seller_id
}: GetProductPromiseInput): Promise<DeliveryPromiseErrorResult | DeliveryPromiseResult> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const knex = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
  try {
    // 1) Get variant inventory mapping
    const { data: variants } = await query.graph({
      entity: 'product_variant_inventory_item',
      fields: ['id', 'variant_id', 'inventory_item_id'],
      filters: { variant_id: variantId }
    })

    const variant = variants?.[0]
    if (!variant) {
      return {
        status: false,
        message: 'Variant not found',
        error: 'VARIANT_NOT_FOUND'
      }
    }

    // 2) Get zone for the pincode
    const zone = await fetchZoneByPincode(pincode, knex)

    if (!zone) {
      return {
        status: false,
        message: 'Area is not serviceable',
        error: 'NON_SERVICEABLE_AREA'
      }
    }

    // Verify zone belongs to the specified cluster
    if (zone.location_id !== cluster_id) {
      return {
        status: false,
        message: 'Area is not serviceable by this cluster',
        error: 'NON_SERVICEABLE_AREA'
      }
    }

    // 3) Use reusable step to calculate delivery promise
    return await calculateDeliveryPromiseFromZone({
      scope,
      zone_id: zone.id,
      location_id: cluster_id,
      seller_id: seller_id,
      variant_id: variantId
    })

  } catch (error) {
    console.error('Error in getProductPromise:', error)
    return {
      status: false,
      message: 'Failed to compute delivery promise',
      error: 'COMPUTE_FAILED'
    }
  }
}
