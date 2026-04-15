// src/api/store/delivery-promise/route.ts
import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { getHomePromise } from '../../../workflows/delivery-promise/workflows/get-home-promise'
import { StoreGetDeliveryPromiseParamsType } from './validators'

export async function GET(
  req: MedusaRequest<StoreGetDeliveryPromiseParamsType>,
  res: MedusaResponse
) {
  const validatedQuery = req.validatedQuery as StoreGetDeliveryPromiseParamsType
  const { pincode } = validatedQuery

  try {
    const data = await getHomePromise({ 
      scope: req.scope, 
      pincode
    })
    return res.json(data)
  } catch {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get delivery promise'
      }
    })
  }
}