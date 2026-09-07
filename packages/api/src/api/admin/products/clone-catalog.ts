import { Request, Response } from "express";

// Using type-only imports to avoid dependency issues
type EntityManager = any;
type ProductService = any;

/**
 * @schema AdminProductCloneCatalogReq
 * type: object
 * required:
 *   - source_seller_id
 *   - target_seller_id
 * properties:
 *   source_seller_id:
 *     type: string
 *     description: The ID of the source seller
 *   target_seller_id:
 *     type: string
 *     description: The ID of the target seller
 */
export default async (req: Request, res: Response) => {
  const { source_seller_id, target_seller_id } = req.body;

  const productService = req.scope.resolve("productService") as ProductService;
  const manager: EntityManager = req.scope.resolve("manager");

  if (!source_seller_id || !target_seller_id) {
    return res.status(400).json({
      message: "source_seller_id and target_seller_id are required",
      success: false,
    });
  }

  try {
    await manager.transaction(async (transactionManager) => {
      // Get all products from the source seller
      const products = await productService.list(
        { seller_id: source_seller_id },
        {
          relations: [
            "variants",
            "variants.prices",
            "variants.options",
            "options",
            "tags",
            "type",
            "collection",
            "categories",
            "images",
          ],
        }
      );

      // For each product, clone it to the target seller if it doesn't already exist
      for (const product of products) {
        // Check if product with same SKU already exists for target seller
        const existingProducts = await productService.list(
          {
            sku: product.variants?.[0]?.sku,
            seller_id: target_seller_id,
          },
          { take: 1 }
        );

        if (existingProducts.length > 0) {
          // Skip this product as it already exists for the target seller
          continue;
        }

        // Create a new product for the target seller
        const newProductData = {
          ...product,
          id: undefined, // Let the database generate a new ID
          seller_id: target_seller_id,
          variants: product.variants?.map((variant) => ({
            ...variant,
            id: undefined, // Let the database generate a new ID
            product_id: undefined, // Will be set by the product service
            prices: variant.prices?.map((price) => ({
              ...price,
              id: undefined, // Let the database generate a new ID
              variant_id: undefined, // Will be set by the variant service
            })),
            options: variant.options?.map((option) => ({
              ...option,
              id: undefined, // Let the database generate a new ID
              variant_id: undefined, // Will be set by the variant service
            })),
          })),
          options: product.options?.map((option) => ({
            ...option,
            id: undefined, // Let the database generate a new ID
            product_id: undefined, // Will be set by the product service
          })),
          images: product.images?.map((image) => ({
            ...image,
            id: undefined, // Let the database generate a new ID
          })),
        };

        // Create the new product
        await productService.create(newProductData);
      }
    });

    return res.status(200).json({
      message: "Successfully cloned the entire catalog to the target seller",
      success: true,
    });
  } catch (error) {
    console.error("Error cloning catalog:", error);
    return res.status(500).json({
      message: `Error cloning catalog: ${error.message}`,
      success: false,
    });
  }
};
