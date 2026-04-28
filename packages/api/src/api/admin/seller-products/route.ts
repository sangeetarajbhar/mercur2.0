import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import SellerProductLink from "@mercurjs/core-plugin/links/product-seller-link"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const {
    seller_id,
    brand_id,
    category_id,
    status,
    created_at,
    updated_at,
    tag_id,
    type_id,
    sales_channel_id,
    sku,
    q, // Add search parameter
    limit = 20,
    offset = 0,
  } = req.query
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Step 1: Get product IDs for sales_channel_id
  let productIds: string[] | undefined = undefined
  if (sales_channel_id) {
    const { data: productSalesChannels } = await query.graph({
      entity: "product_sales_channel",
      fields: ["product_id"],
      filters: { sales_channel_id: sales_channel_id as string },
    })
    productIds = productSalesChannels.map((psc: any) => psc.product_id)
    if (!productIds.length) {
      return res.json({ products: [], count: 0, limit: 0, offset: 0 })
    }
  }

  // Step 2: Get product IDs for tag_id
  let tagProductIds: string[] | undefined = undefined
  if (tag_id) {
    const { data: productTags } = await query.graph({
      entity: "product_tags",
      fields: ["product_id"],
      filters: { product_tag_id: tag_id } as any,
    })
    tagProductIds = productTags.map((pt: any) => pt.product_id)
    if (!tagProductIds.length) {
      return res.json({ products: [], count: 0, limit: 0, offset: 0 })
    }
  }

  // Step 3: Get product IDs for SKU filter (from product variants)
  let skuProductIds: string[] | undefined = undefined
  if (sku && typeof sku === 'string' && sku.trim().length > 0) {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["product_id"],
      filters: {
        sku: { $ilike: `%${sku.trim()}%` }
      },
    })
    skuProductIds = [...new Set(variants.map((v: any) => v.product_id))]
    if (!skuProductIds.length) {
      return res.json({ products: [], count: 0, limit: 0, offset: 0 })
    }
  }

  // Step 4: Get product IDs for brand_id (using product-brand link)
  let brandProductIds: string[] | undefined = undefined
  if (brand_id) {
    const { data: productBrands } = await query.graph({
      entity: "product_brand",
      fields: ["product_id"],
      filters: { brand_id } as any,
    })
    brandProductIds = productBrands.map((pb: any) => pb.product_id)
    if (!brandProductIds.length) {
      return res.json({ products: [], count: 0, limit: 0, offset: 0 })
    }
  }

  // Step 5: Get product IDs for category_id
  let categoryProductIds: string[] | undefined = undefined
  if (category_id) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { categories: { id: category_id } } as any,
    })
    categoryProductIds = products.map((p: any) => p.id)
    if (!categoryProductIds.length) {
      return res.json({ products: [], count: 0, limit: 0, offset: 0 })
    }
  }

  // Step 6: Build product filters for other product-level filters
  const productFilters: any = {}
  if (status) productFilters.status = status
  if (created_at) productFilters.created_at = created_at
  if (updated_at) productFilters.updated_at = updated_at
  if (type_id) productFilters.type_id = type_id
  
  // Add search functionality
  if (q && typeof q === 'string' && q.trim().length > 0) {
    const search = `%${q.trim()}%`
    productFilters.$or = [
      { title: { $ilike: search } },
      { description: { $ilike: search } },
      { handle: { $ilike: search } },
    ]
  }

  // Step 7: Combine product IDs from sales_channel, tag, brand, category, and sku filters (excluding seller)
  let combinedProductIds: string[] | undefined = undefined
  const productIdArrays = [productIds, tagProductIds, brandProductIds, categoryProductIds, skuProductIds].filter(Boolean)
  
  if (productIdArrays.length > 0) {
    // Start with the first array and find intersection with all others
    combinedProductIds = productIdArrays.reduce((acc, current) => {
      if (!acc) return current
      return acc!.filter(id => current!.includes(id))
    })
    
    // If intersection results in empty array, return empty result
    if (combinedProductIds && combinedProductIds.length === 0) {
      return res.json({ products: [], count: 0, limit: 0, offset: 0 })
    }
  }

  if (combinedProductIds) productFilters.id = combinedProductIds

  // Step 8: Query products by filters if any product filter is present
  let filteredProductIds: string[] | undefined = undefined
  if (Object.keys(productFilters).length > 0) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: productFilters,
    })
    filteredProductIds = products.map((p: any) => p.id)
    if (!filteredProductIds.length) {
      return res.json({ products: [], count: 0, limit: 0, offset: 0 })
    }
  }

  // Step 9: Build filters for the link table (seller filter applied here for correct relationship handling)
  const filters: any = {}
  if (seller_id) filters.seller_id = seller_id
  if (filteredProductIds) filters.product_id = filteredProductIds

  // Step 10: Query the link table and fetch related products and seller info
  const { data: links, metadata: { count, take, skip } = {} } = await query.graph({
    entity: SellerProductLink.entryPoint,
    fields: [
      "id",
      "name",
      "product.*",
      "product.collection_id",
      "product.sales_channels.*",
      "product.variants.*",
      "product.sellers.*",
      "seller.*",
      "product.brand.*",
      "product.categories.*",
    ],
   
    filters,
    pagination: { skip: Number(offset), take: Number(limit) },
  })

  // Fetch all collections (or only those needed)
  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title"],
  })

  const collectionMap = new Map(collections.map((c: any) => [c.id, c.title]))

  const products = links.map((link: any) => ({
    ...link.product,
    collection_title: collectionMap.get(link.product.collection_id) || "—",
    sales_channels: link.product.sales_channels,
    variants: link.product.variants,
    sellers: link.seller,
    brand: link.product.brand,
    categories: link.product.categories,
    status: link.product.status,
  }))

  res.json({
    products,
    count,
    limit: take,
    offset: skip,
  })
}