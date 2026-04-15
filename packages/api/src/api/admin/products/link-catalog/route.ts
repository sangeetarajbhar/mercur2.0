import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PostLinkCatalogSchema } from "./validators"
import { Modules } from "@medusajs/framework/utils"
import { acceptProductCloneRequestWorkflow } from "../../../../workflows/requests/workflows/accept-product-clone-request"

type ProductService = any
type InventoryService = any
type ProductVariant = { id: string; inventory_item_id?: string }
type InventoryItem = { id: string }

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  try {
    const validationResult = PostLinkCatalogSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validationResult.error.errors,
        success: false,
      })
    }

    const { target_seller_id, product_ids } = validationResult.data

    const productService = req.scope.resolve(Modules.PRODUCT) as ProductService
    const inventoryService = req.scope.resolve(Modules.INVENTORY) as InventoryService

    const productLinks: { id: string }[] = []
    const inventoryItemLinks: { id: string }[] = []

    for (const productId of product_ids) {
      try {
        productLinks.push({ id: productId })

        const variants = (await productService.listProductVariants({ product_id: productId })) as ProductVariant[]
        const inventoryItemIds = variants
          .map((variant) => variant.inventory_item_id)
          .filter((id): id is string => Boolean(id))

        if (inventoryItemIds.length > 0) {
          const inventoryItems = (await inventoryService.listInventoryItems({ id: inventoryItemIds })) as InventoryItem[]
          for (const item of inventoryItems) {
            inventoryItemLinks.push({ id: item.id })
          }
        }
      } catch (error) {
        console.error(`Error processing product ${productId}:`, error)
      }
    }

    // Execute the workflow
    const { result } = await acceptProductCloneRequestWorkflow(req.scope).run({
      input: {
        target_seller_id,
        productLinks,
        inventoryItemLinks,
      },
    })

    return res.status(200).json({
      message: result.message,
      success: true,
      processed_products: product_ids.length,
      count: result.count,
    })
  } catch (error: any) {
    console.error("Error linking catalog:", error)
    return res.status(500).json({
      message: `Error linking catalog: ${error.message}`,
      success: false,
    })
  }
}
