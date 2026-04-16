// import { PriceListStatus, MedusaError } from '@medusajs/framework/utils'
// import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

// import { VendorCreatePriceListImport } from '../../../api/vendor/price-lists/validators'
// import { 
//   validatePriceValue, 
//   validatePercentageDiscount
// } from '../../../api/utils/price-list-validation'

// export const validateImportSellerPriceList = createStep(
//   'validate-import-seller-price-list',
//   async (price_lists: unknown[]) => {

//     const toCreate = price_lists.map((price_list: any, index) => {
//       try {
//         // Preserve variant_id from original prices before parsing (Zod will strip it)
//         const originalPrices = price_list.prices || []
//         const skuToVariantId = new Map<string, string>()
//         originalPrices.forEach((price: { sku?: string; variant_id?: string }) => {
//           if (price.sku && price.variant_id) {
//             skuToVariantId.set(price.sku, price.variant_id)
//           }
//         })
        
//         // Validate the basic schema first (this already includes date validation with ASAP flag)
//         const parsed = VendorCreatePriceListImport.parse(price_list)
        
//         // Restore variant_id to prices after parsing (match by SKU to handle reordering)
//         if (parsed.prices && parsed.prices.length > 0) {
//           parsed.prices.forEach((price: { sku?: string; variant_id?: string }) => {
//             if (price.sku) {
//               const variantId = skuToVariantId.get(price.sku)
//               if (variantId) {
//                 price.variant_id = variantId
//               }
//             }
//           })
//         }
        
//         // Validate each price entry
//         // Note: The schema already validates prices, but we do additional checks for clarity
//         if (parsed.prices && parsed.prices.length > 0) {
//           parsed.prices.forEach((price: any) => {
//             // Only validate amount if it's not 0 (0 is allowed when percentage_discount is provided)
//             if (price.amount !== null && price.amount !== undefined && price.amount > 0) {
//               validatePriceValue(price.amount)
//             }

//             if (price.percentage_discount !== null && price.percentage_discount !== undefined) {
//               validatePercentageDiscount(price.percentage_discount)
//             }
//           })
//         }
//         return {
//           ...parsed,
//           status: 'active' as PriceListStatus
//         }
//       } catch (error) {
//         console.error(`Validation failed for price list ${index}:`, error)
//         throw new MedusaError(
//           MedusaError.Types.INVALID_DATA,
//           `Price list validation failed at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`
//         )
//       }
//     })

//     return new StepResponse(toCreate)
//   }
// )
