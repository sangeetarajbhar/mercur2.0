// import {
//   createRemoteLinkStep,
//   // getVariantsStep,
//   useQueryGraphStep
// } from '@medusajs/medusa/core-flows'


// import {
//   WorkflowResponse,
//   createWorkflow,
//   transform,
//   when
// } from '@medusajs/framework/workflows-sdk'

// import { REQUESTS_MODULE } from '../../../modules/request'
// import {
//   RequestStatus
// } from '../../../types/request'

// import { PriceListRequestUpdatedEvent } from '../../../modules/requests/types/events'
// import { FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX } from '../../../config/fixed-price-list'


// import { Modules, QueryContext } from "@medusajs/framework/utils"

// import { SELLER_MODULE } from '@mercurjs/seller'
// import { emitMultipleEventsStep } from '../../common/steps'
// import { createRequestStep } from '../../requests/steps'
// import {
//   validateImportSellerPriceList,
//   createPriceListImportRequestCreatedNotificationStep,
//   createPriceListImportDirectSuccessNotificationStep
// } from '../steps'
// import { parsePriceListCsvStep } from '../steps/parsePriceListCsvStep'
// import { createCustomPriceListsWorkflow } from '../../../workflows/price-list/workflows'
// import { validateSellerProductMappingStep } from '../../price-list/steps'
// import type { ExtendedCreatePriceListWorkflowInputDTO } from '../../price-list/workflows/create-custom-price-lists'


// export const importSellerPriceListsWorkflow = createWorkflow({
//   name: 'import-seller-price-lists',
// },
//   function (input: {
//     file_content: string
//     file_name: string
//     seller_id: string
//     submitter_id: string
//     enabledConfiguration: boolean
//   }) {

//     const price_list = parsePriceListCsvStep({fileContent: input.file_content, fileName:input.file_name})

//     const skus = transform({ price_list }, ({ price_list }) => {
//       // extract all unique SKUs from parsed data
//       return [...new Set(price_list.flatMap(list => list.prices.map(p => p.sku)))]
//     })

//     // const variants = getVariantsStep({ filter: { sku: skus } })
//     const { data: regions } = useQueryGraphStep({
//       entity: "region",
//       fields: ["id"],
//       pagination: { take: 1 }, // Optional: limit to one region if you only have one
//     }).config({name:"get-single-region-value"})
//     const regionId = transform({ regions }, ({ regions }) => regions[0].id)

//     const variants = useQueryGraphStep({
//       entity: "variant",
//       fields: [
//         "id",
//         "sku",
//         "calculated_price.*"
//       ],
//       filters: { sku: skus },
//       context: {
//         calculated_price: QueryContext({
//           region_id: regionId,
//           currency_code: "inr",
//         }),
//       },
//     })

//     const priceListsWithVariantIds = transform({ price_list, variants, regionId }, ({ price_list, variants, regionId }) => {
//       // const skuToVariant = Object.fromEntries(
//       //   variants.data.map(v => [v.sku, { id: v.id, original_price: v.calculated_price?.original_amount }])
//       // )

//       const skuToVariant = Object.fromEntries(
//         variants.data.map((v) => {
//           return [v.sku, { id: v.id, original_price: v.calculated_price?.original_amount }]
//         })
//       )
//       // return price_list.map(list => ({
//       //   ...list,
//       //   prices: list.prices
//       //     .map(price => {
//       //       const variant = skuToVariant[price.sku]
//       //       const originalPrice = variant?.original_price
//       //       if (!variant || typeof variant.original_price !== "number") {
//       //         // Optionally, skip or handle missing variant/price here
//       //         return null
//       //       }
//       const processedPriceLists: any[] = []
//       const errors: string[] = []

//       for (const list of price_list) {
//         const processedPrices: any[] = []

//         for (const price of list.prices) {
//           const variant = skuToVariant[price.sku]
//           const originalPrice = variant?.original_price

//           // Strict validation - fail if variant not found or price missing
//           if (!variant) {
//             errors.push(`SKU "${price.sku}" not found in system`)
//             continue
//           }

//           if (typeof originalPrice !== "number" || originalPrice <= 0) {
//             errors.push(`No valid original price found for SKU "${price.sku}"`)
//             continue
//           }

//           let amount = price.amount;
//           let percentage_discount = price.percentage_discount;

//           // Validate input values are not negative
//           if (amount !== null && amount !== undefined && amount < 0) {
//             errors.push(`Invalid amount for SKU "${price.sku}": ${amount}. Amount cannot be negative.`)
//             continue
//           }

//           if (percentage_discount !== null && percentage_discount !== undefined && percentage_discount < 0) {
//             errors.push(`Invalid percentage discount for SKU "${price.sku}": ${percentage_discount}%. Percentage discount cannot be negative.`)
//             continue
//           }

//           // Calculate amount from percentage discount
//           if ((amount == null || amount <= 0) && typeof percentage_discount === "number" && percentage_discount > 0) {
//             amount = Math.round(originalPrice - (originalPrice * percentage_discount) / 100)
//           }


//           // Calculate percentage from amount
//           if ((percentage_discount == null || percentage_discount <= 0) && typeof amount === "number" && amount > 0) {
//             percentage_discount = Math.round(((originalPrice - amount) / originalPrice) * 100)
//           }

//           // Validate final calculated values
//           if (!amount || amount <= 0) {
//             errors.push(`Invalid amount calculated for SKU "${price.sku}": ${amount}. Amount must be greater than 0.`)
//             continue
//           }

//           // Validate calculated amount is not greater than original price (would result in negative discount)
//           if (amount > originalPrice) {
//             errors.push(`Invalid amount for SKU "${price.sku}": ${amount}. Amount (${amount}) cannot be greater than original price (${originalPrice}).`)
//             continue
//           }

//           // Validate percentage discount is within valid range (0-80%)
//           if (percentage_discount !== null && percentage_discount !== undefined) {
//             if (percentage_discount < 0) {
//               errors.push(`Invalid percentage discount for SKU "${price.sku}": ${percentage_discount}%. Percentage discount cannot be negative.`)
//               continue
//             }
//             if (percentage_discount > FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX) {
//               errors.push(`Percentage discount too high for SKU "${price.sku}": ${percentage_discount}% (max ${FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX}%)`)
//               continue
//             }
//           }

//           processedPrices.push({
//             ...price,
//             variant_id: variant.id,
//             amount,
//             percentage_discount,
//             rules: { region_id: regionId }, // Region rule
//           })
//         }

//         if (processedPrices.length === 0 && list.prices.length > 0) {
//           errors.push(`No valid prices found for price list "${list.title}"`)
//         }

//         if (processedPrices.length > 0) {
//           processedPriceLists.push({
//             ...list,
//             prices: processedPrices
//           })
//         }
//       }

//       // If there are validation errors, throw them
//       if (errors.length > 0) {
//         throw new Error(`Price list validation failed:\n${errors.join('\n')}`)
//       }

//       return processedPriceLists
//     })

//     // Extract all SKUs for seller validation
//     const allSkus = transform({ priceListsWithVariantIds }, ({ priceListsWithVariantIds }) => {
//       const skuSet = new Set<string>()
//       priceListsWithVariantIds.forEach((priceList: any) => {
//         if (priceList.prices) {
//           priceList.prices.forEach((price: any) => {
//             if (price.sku && price.sku.trim()) {
//               skuSet.add(price.sku.trim())
//             }
//           })
//         }
//       })
//       return Array.from(skuSet)
//     })

//     // Validate seller-product mapping for all SKUs
//     validateSellerProductMappingStep({
//       skus: allSkus,
//       seller_id: input.seller_id
//     })

//     const batchCreate = validateImportSellerPriceList(priceListsWithVariantIds)

//     when('enabled-configuration-true', input, (input) => input.enabledConfiguration).then(() => {

//       const requestsPayload = transform(
//         { batchCreate, input },
//         ({ batchCreate, input }) => {
//           return batchCreate.map((p) => ({
//             data: {
//               ...p,
//               // price_list_id: p.id
//             },
//             submitter_id: input.submitter_id,
//             type: 'price_list',
//             status: 'pending' as RequestStatus
//           }))
//         }
//       )

//       const requests = createRequestStep(requestsPayload).config({ name: "create-pricelist-with-request" })

//       const link = transform({ requests, input }, ({ requests, input }) => {
//         return requests.map(({ id }) => ({
//           [SELLER_MODULE]: {
//             seller_id: input.seller_id
//           },
//           [REQUESTS_MODULE]: {
//             request_id: id
//           }
//         }))
//       })

//       createRemoteLinkStep(link).config({ name: "create-remote-links-with-request" })

//       const notificationPayloadRequest = transform(
//         { requests, input },
//         ({ requests, input }) => ({
//           seller_id: input.seller_id,
//           file_name: input.file_name,
//           count: requests.length
//         })
//       )
//       createPriceListImportRequestCreatedNotificationStep(notificationPayloadRequest)

//       return new WorkflowResponse(requests)

//     })

//     when("enabled-configuration-false", input, (input) => !input.enabledConfiguration).then(() => {

//       const created = createCustomPriceListsWorkflow.runAsStep({
//         input: {
//           price_lists_data: batchCreate as ExtendedCreatePriceListWorkflowInputDTO[],
//           // additional_data: { seller_id: input.seller_id }
//         }
//       })

//       const requestsPayload = transform(
//         { created, input },
//         ({ created, input }) => {
//           return created.map((p) => ({
//             data: {
//               ...p,
//               price_list_id: p.id
//             },
//             submitter_id: input.submitter_id,
//             type: 'price_list',
//             status: 'accepted' as RequestStatus
//           }))
//         }
//       )

//       const requests = createRequestStep(requestsPayload).config({ name: "create-pricelist-without-request" })

//       const link = transform({ created, input }, ({ created, input }) => {
//         return created.map(({ id }) => ({
//           [SELLER_MODULE]: {
//             seller_id: input.seller_id
//           },
//           [Modules.PRICING]: {
//             price_list_id: id
//           }
//         }))
//       })

//       const events = transform(requests, (requests) => {
//         return requests.map(({ id }) => ({
//           name: PriceListRequestUpdatedEvent.CREATED,
//           data: { id }
//         }))
//       })

//       createRemoteLinkStep(link).config({ name: "create-remote-links-without-request" })
//       emitMultipleEventsStep(events).config({ name: "emit-event-without-request" })

//       const notificationPayloadDirect = transform(
//         { created, input },
//         ({ created, input }) => ({
//           seller_id: input.seller_id,
//           file_name: input.file_name,
//           count: created.length
//         })
//       )
//       createPriceListImportDirectSuccessNotificationStep(notificationPayloadDirect)

//       return new WorkflowResponse(created)

//     })
//   }
// )
