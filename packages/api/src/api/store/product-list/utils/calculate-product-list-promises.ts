import { MedusaContainer } from '@medusajs/framework'
import { calculateDeliveryPromiseFromZone } from '../../../../workflows/delivery-promise/steps'

export type ProductPromise = {
  delivery_type: 'instant' | 'slotted' | null
  delivery_minutes: number | null
  message: string
  eta_iso?: string
  slot_id?: string
  slot_date?: string
  start_time?: string
  end_time?: string
  formatted_time_range?: string
}

export type CalculateProductListPromisesInput = {
  scope: MedusaContainer
  products: Array<{
    id: string
    min_price_variant_id?: string
    /**
     * Seller ID to use for promise calculation (preferred).
     * When present, we don't need to derive seller from variant pricing structures.
     */
    seller_id?: string
    variants?: Array<{
      id: string
      min_price_seller_id?: string
    }>
  }>
  zone_id: string
  cluster_id: string
}

/**
 * Calculate delivery promises for multiple products in product list
 * - Extracts min_price_variant_id from each product
 * - Uses seller_id directly from product response (preferred)
 * - Uses calculateDeliveryPromiseFromZone (same as PDP) for each product
 * 
 * @returns Map of product_id -> ProductPromise
 */
export async function calculateProductListPromises({
  scope,
  products,
  zone_id,
  cluster_id
}: CalculateProductListPromisesInput): Promise<Map<string, ProductPromise>> {
  const promiseMap = new Map<string, ProductPromise>()

  if (!zone_id || !products || products.length === 0) {
    return promiseMap
  }

  try {

    // Extract variant IDs and create product -> variant mapping
    const productVariantMap = new Map<string, string>() // product_id -> variant_id

    products.forEach((product) => {

      const minPriceVariantId = product.variants && product.variants.length > 0 ? product.variants[0].id : null

      if (!minPriceVariantId) return

      productVariantMap.set(product.id, minPriceVariantId)
    })

    if (productVariantMap.size === 0) {
      return promiseMap
    }

    // Calculate promises for all products in parallel using calculateDeliveryPromiseFromZone (same as PDP)
    const promisePromises = products.map(async (product) => {
      const variantId = productVariantMap.get(product.id)
      if (!variantId) {
        return { productId: product.id, promise: null }
      }

      const sellerId = product.seller_id || null

      try {

        // Use calculateDeliveryPromiseFromZone (same as PDP flow)
        const promiseResult = await calculateDeliveryPromiseFromZone({
          scope,
          zone_id,
          location_id: cluster_id,
          seller_id: sellerId,
          variant_id: variantId
        })

        // Transform DeliveryPromiseResult to ProductPromise format
        // Check if it's an error result (has 'error' field) or success result (has 'delivery_type')
        if (promiseResult && 'error' in promiseResult) {
          // It's an error result
          return { productId: product.id, promise: null }
        }

        // It's a success result - check for delivery_type
        if (promiseResult && 'delivery_type' in promiseResult) {
          const result = promiseResult as any
          const promise: ProductPromise = {
            delivery_type: result.delivery_type || null,
            delivery_minutes: result.delivery_minutes || null,
            message: result.message || '',
            eta_iso: result.eta_iso,
            // For slotted delivery, delivery_date is available but slot details are in the message
            ...(result.delivery_type === 'slotted' && {
              slot_date: result.delivery_date
            })
          }
          return { productId: product.id, promise }
        }

        return { productId: product.id, promise: null }
      } catch (error) {
        console.error(`Error calculating promise for product ${product.id}:`, error)
        return { productId: product.id, promise: null }
      }
    })

    const promiseResults = await Promise.all(promisePromises)

    // Build promise map
    promiseResults.forEach(({ productId, promise }) => {
      if (promise) {
        promiseMap.set(productId, promise)
      }
    })

    return promiseMap
  } catch (error) {
    console.error('Error in calculateProductListPromises:', error)
    return promiseMap
  }
}
