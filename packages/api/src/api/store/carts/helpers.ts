// import { MedusaContainer } from "@medusajs/framework/types"
// import {
//   ContainerRegistrationKeys,
//   remoteQueryObjectFromString,
// } from "@medusajs/framework/utils"
// import { HttpTypes } from "@medusajs/framework/types"

// export const refetchCart = async (
//   id: string,
//   scope: MedusaContainer,
//   fields: string[]
// ) => {
//   const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
//   const queryObject = remoteQueryObjectFromString({
//     entryPoint: "cart",
//     variables: { filters: { id } },
//     fields,
//   })

//   const [cart] = await remoteQuery(queryObject)

//   return cart
// }

// export const refetchCartWithDeliveryDetails = async (
//   id: string,
//   scope: MedusaContainer,
//   fields: string[]
// ) => {
//   const cart = await refetchCart(id, scope, fields)
//
//   try {
//     const query = scope.resolve(ContainerRegistrationKeys.QUERY)
//     const { data: deliveryDetails } = await query.graph({
//       entity: 'cart_delivery_detail',
//       filters: { cart_id: id },
//       fields: ['id', 'delivery_type', 'delivery_date', 'delivery_time', 'delivery_slot_type', 'cart_id']
//     })
//
//     return {
//       ...cart,
//       delivery_details: deliveryDetails.length > 0 ? (() => {
//         const deliveryDetail = deliveryDetails[0]
//         const deliveryDate = deliveryDetail.delivery_date ? new Date(deliveryDetail.delivery_date) : null
//         const today = new Date()
//         today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison
//
//         // If delivery date is in the past, return empty object
//         if (deliveryDate && deliveryDate < today) {
//           return {}
//         }
//         // Return delivery details with transformed date
//         return {
//           ...deliveryDetail,
//           delivery_date: deliveryDate ? deliveryDate.toISOString().split('T')[0] : undefined
//         }
//       })() : null
//     }
//   } catch (error) {
//     return {
//       ...cart,
//       delivery_details: null
//     }
//   }
// }

// Below are the types required for the transformCart function
// type LineItem = {
//   id: string;
//   [key: string]: any; // preserve all other fields
// };

// type ServiceableVariant = { line_item_id: string };
// type NonServiceableVariant = { line_item_id: string };
// type OutOfStockItem = { line_item_id: string };
// type PartiallyAvailableItem = {
//   line_item_id: string;
//   requested_quantity: number;
//   available_quantity: number;
// };

// type DeliveryPromiseResult = {
//   status: boolean;
//   error?: string;
//   serviceable_variants?: ServiceableVariant[];
//   non_serviceable_variants?: NonServiceableVariant[];
//   out_of_stock_items?: OutOfStockItem[];
//   partially_available_items?: PartiallyAvailableItem[];
//   [key: string]: any; // preserve other fields
// };

// export const transformCart = (cart: HttpTypes.StoreCart & { deliveryPromiseResult?: DeliveryPromiseResult }): HttpTypes.StoreCart => {
//   const dp = cart.deliveryPromiseResult ?? {} as DeliveryPromiseResult;
//
//   // Create lookup maps for quick access
//   const serviceableMap = new Map(dp.serviceable_variants?.map(v => [v.line_item_id, true]) ?? []);
//   const nonServiceableMap = new Map(dp.non_serviceable_variants?.map(v => [v.line_item_id, true]) ?? []);
//   const outOfStockMap = new Map(dp.out_of_stock_items?.map(v => [v.line_item_id, true]) ?? []);
//   const partialMap = new Map(dp.partially_available_items?.map(v => [v.line_item_id, v]) ?? []);
//
//   // Enrich items with flags, preserve all other info
//   cart.items = (cart.items || []).map(item => {
//     const partialInfo = partialMap.get(item.id);
//
//     return {
//       ...item,
//       is_serviceable: serviceableMap.has(item.id) || !nonServiceableMap.has(item.id),
//       // is_non_serviceable: nonServiceableMap.has(item.id),
//       is_out_of_stock: outOfStockMap.has(item.id),
//       is_partially_available: Boolean(partialInfo),
//       ...(partialInfo ? {
//         requested_quantity: (partialInfo as PartiallyAvailableItem).requested_quantity,
//         available_quantity: (partialInfo as PartiallyAvailableItem).available_quantity,
//       } : {}),
//     };
//   });
//
//   // Clean up deliveryPromiseResult
//   if (cart.deliveryPromiseResult) {
//     const {
//       serviceable_variants,
//       non_serviceable_variants,
//       out_of_stock_items,
//       partially_available_items,
//       message,
//       ...rest
//     } = cart.deliveryPromiseResult;
//
//     cart.deliveryPromiseResult = { ...rest };
//   }
//
//   return cart;
// };
