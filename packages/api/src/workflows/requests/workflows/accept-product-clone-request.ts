import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep, useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import {MercurModules} from "@mercurjs/types"
const SELLER_MODULE = MercurModules.SELLER

type WorkflowInput = { product: string, sellerId: string }

type AcceptProductCloneInput = {
  target_seller_id: string;
  productLinks: { id: string }[];
  inventoryItemLinks: { id: string }[];
};

// const mapProductToSellerStep = createStep(
//   "map-product-to-seller",
//   async (input: WorkflowInput, { container }) => {
//     const { product, sellerId } = input
//     const query = container.resolve("query")

//     console.log("product", product)
//     console.log("sellerId", sellerId)

//     // 1. Get inventory item IDs for the product's variants
//     const { data: variants } = await query.graph({
//       entity: "variant",
//       fields: ["inventory_items.id", "inventory_items.inventory_item_id"],
//       filters: { product_id: product }
//     })
//     console.log("variants", variants)
//     // Collect all inventory item IDs from all variants
//     const inventoryItemIds = variants
//       .flatMap(variant => variant.inventory_items?.map(item => item.inventory_item_id) || [])

//     console.log("inventoryItemIds", inventoryItemIds)

//     // 2. Fetch inventory items by IDs
//     const inventoryModuleService = container.resolve(Modules.INVENTORY)
//     const inventoryItems = await inventoryModuleService.listInventoryItems({ id: inventoryItemIds })

//     const { data: existingProductLinks } = await query.graph({
//       entity: "seller_product", // Adjust entity name if different
//       fields: ["seller_id", "product_id"],
//       filters: { seller_id: sellerId, product_id: product },
//     });
//     const productLinkExists = existingProductLinks && existingProductLinks.length > 0;

//     console.log("productLinkExists", productLinkExists)

//     // // 4. Check for existing seller-inventory links
//     // let existingInventoryLinks: Array<{ seller_id: string; inventory_item_id: string }> = [];
//     // if (inventoryItemIds.length > 0) {
//     //   const { data: invLinks } = await query.graph({
//     //     entity: "seller_inventory", // Adjust entity name if different
//     //     fields: ["seller_id", "inventory_item_id"],
//     //     filters: { seller_id: sellerId, inventory_item_id: inventoryItemIds },
//     //   });
//     //   existingInventoryLinks = invLinks || [];
//     // }
//     // const existingInventorySet = new Set(
//     //   existingInventoryLinks.map((l) => l.inventory_item_id)
//     // );

//     // console.log("existingInventorySet", existingInventorySet)

//     console.log("inventoryItems", inventoryItems)

//     const productLink = {
//       [SELLER_MODULE]: { seller_id: sellerId },
//       [Modules.PRODUCT]: { product_id: product },
//     }
//     const inventoryLinks = inventoryItems.map((item) => ({
//       [SELLER_MODULE]: { seller_id: sellerId },
//       [Modules.INVENTORY]: { inventory_item_id: item.id },
//     }))
//     const links = [productLink, ...inventoryLinks]
//     // const links = []
//     console.log("links", links)
//     return new StepResponse({ links })
//   }
// )

// export const acceptProductCloneRequestWorkflow = createWorkflow(
//   "accept-product-clone-request",
//   function (input: AcceptRequestDTO) {
//     const { data: products } = useQueryGraphStep({
//       entity: "product",
//       fields: ["id", "title", "variants.id", "variants.title", "variants.sku"],
//       filters: { variants: { sku: input.data.product_sku } },
//     })
//     if (!products || products.length === 0) {
//       throw new Error("Product not found")
//     }
//     const product = products[0]
//     const { data: requests } = useQueryGraphStep({
//       entity: "request",
//       fields: ["id", "submitter_id"],
//       filters: { id: input.id },
//     }).config({ name: "fetch-requests" })
//     const submitterId = requests[0].submitter_id
//     const { data: seller } = useQueryGraphStep({
//       entity: "member",
//       fields: ["id", "seller_id"],
//       filters: { id: submitterId },
//     }).config({ name: "fetch-seller" })
//     const sellerId = seller[0].seller_id

//     const { links } = mapProductToSellerStep({ product: product.id, sellerId })
//     console.log("links", links)
//     createRemoteLinkStep(links)
//     updateRequestWorkflow.runAsStep({ input })
//     return new WorkflowResponse({ message: "Product mapped to seller successfully", product: product })
//   }
// )

const mapProductToSellerStep = createStep(
  "map-product-to-seller",
  async (input: AcceptProductCloneInput, { container }) => {
    const { target_seller_id, productLinks, inventoryItemLinks } = input
    const query = container.resolve("query")

    // console.log("target_seller_id", target_seller_id)
    // console.log("productLinks", productLinks)
    // console.log("inventoryItemLinks", inventoryItemLinks)

    // 1. Get inventory item IDs for the product's variants
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["inventory_items.id", "inventory_items.inventory_item_id"],
      filters: { product_id: productLinks.map((product) => product.id) }
    })
    // console.log("variants", variants)
    // Collect all inventory item IDs from all variants
    const inventoryItemIds = variants
      .flatMap(variant => variant.inventory_items?.map(item => item?.inventory_item_id) || []) 

    // console.log("inventoryItemIds", inventoryItemIds)

    // 2. Fetch inventory items by IDs
    const inventoryModuleService = container.resolve(Modules.INVENTORY)
    const inventoryItems = await inventoryModuleService.listInventoryItems({ id: inventoryItemIds as string[] })

    const { data: existingProductLinks } = await query.graph({
      entity: "seller_product", // Adjust entity name if different
      fields: ["seller_id", "product_id"],
      filters: { seller_id: target_seller_id, product_id: productLinks.map((product) => product.id) },
    });
    const productLinkExists = existingProductLinks && existingProductLinks.length > 0;

    console.log("productLinkExists", productLinkExists)

    // console.log("inventoryItems", inventoryItems)

    // const productLink = {
    //   [SELLER_MODULE]: { seller_id: target_seller_id },
    //   [Modules.PRODUCT]: { product_id: productLinks.map((product) => product.id) },
    // }
    const productLinksTransformed = productLinks.map((product) => ({
      [SELLER_MODULE]: { seller_id: target_seller_id },
      [Modules.PRODUCT]: { product_id: product.id },
    }))
    const inventoryLinks = inventoryItems.map((item) => ({
      [SELLER_MODULE]: { seller_id: target_seller_id },
      [Modules.INVENTORY]: { inventory_item_id: item.id },
    }))
    const links = [...productLinksTransformed, ...inventoryLinks]
    // const links = []
    // console.log("links", links)
    return new StepResponse({ links })
  }
)

export const acceptProductCloneRequestWorkflow = createWorkflow(
  "accept-product-clone-request",
  function (input: AcceptProductCloneInput) {
    const { links } = mapProductToSellerStep(input)

    createRemoteLinkStep(links)

    return new WorkflowResponse({
      message: "Product and inventory linked to seller",
      count: links.length,
    })
  }
)