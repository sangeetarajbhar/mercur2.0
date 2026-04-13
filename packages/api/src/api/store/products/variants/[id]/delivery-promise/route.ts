// src/api/products/variants/[id]/delivery-promise/route.ts
import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { getProductPromise } from '../../../../../../workflows/delivery-promise/workflows/get-product-promise'
import { StoreGetVariantDeliveryPromiseParamsType } from '../../../validators'

export async function GET(
  req: MedusaRequest<StoreGetVariantDeliveryPromiseParamsType>,
  res: MedusaResponse
) {
  const { id: variantId } = req.params
  const { pincode, cluster_id, seller_id } = (req.validatedQuery || req.query) as StoreGetVariantDeliveryPromiseParamsType

  try {
    const data = await getProductPromise({
      scope: req.scope,
      variantId,
      pincode,
      cluster_id,
      seller_id
    })

    return res.json(data)
  } catch {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get variant delivery promise'
      }
    })
  }
}
