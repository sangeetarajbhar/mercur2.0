// import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
// import { featureFlagRouter } from "@medusajs/framework"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, isPresent, remoteQueryObjectFromString, QueryContext } from "@medusajs/framework/utils"
// import IndexEngineFeatureFlag from "@medusajs/medusa/loaders/feature-flags/index-engine"
// import { MedusaStoreRequest } from "@medusajs/framework/http"
import { QueryContextType } from "@medusajs/framework/types"
import { wrapVariantsWithInventoryQuantityForSalesChannel } from "../../utils/middlewares"
import { dataNormalization } from "../../utils/middlewares"
import { wrapVariantsWithSellerPricing } from "../../utils/middlewares"
import { transformProductImageUrls } from "../../utils/middlewares"
import {
  wrapProductsWithTaxPrices,
  RequestWithContext,
  addWishlistFlagToProducts,
  transformProductImageUrlsWithResolution
} from "./helpers"
import { FeatureFlag } from "@medusajs/framework/utils"

export const GET = async (
  req: RequestWithContext<HttpTypes.StoreProductListParams>,
  res: MedusaResponse<HttpTypes.StoreProductListResponse>
) => {
  // Check if index_engine feature is enabled
if (FeatureFlag.isFeatureEnabled("index_engine")) {
  // TODO: These filters are not supported by the index engine yet
  if (
    Object.keys(req.filterableFields).length === 0 ||
    isPresent(req.filterableFields.tags) ||
    isPresent(req.filterableFields.categories)
  ) {
    return await getProducts(req, res)
  }

  return await getProductsWithIndexEngine(req, res)
}
  return await getProducts(req, res)
}

async function getProductsWithIndexEngine(
  req: RequestWithContext<HttpTypes.StoreProductListParams>,
  res: MedusaResponse<HttpTypes.StoreProductListResponse>
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const context: QueryContextType = {}
  const withInventoryQuantity = req.queryConfig.fields.some((field) =>
    field.includes("variants.inventory_quantity")
  )

  if (withInventoryQuantity) {
    req.queryConfig.fields = req.queryConfig.fields.filter(
      (field) => !field.includes("variants.inventory_quantity")
    )
  }

  if (isPresent(req.pricingContext)) {
    context["variants"] ??= {}
    context["variants"]["calculated_price"] = QueryContext(req.pricingContext!)
  }

  const filters: Record<string, any> = req.filterableFields
  if (isPresent(filters.sales_channel_id)) {
    const salesChannelIds = filters.sales_channel_id

    filters["sales_channels"] ??= {}
    filters["sales_channels"]["id"] = salesChannelIds

    delete filters.sales_channel_id
  }

  const { data: products = [], metadata }: any = await query.index({
    entity: "product",
    fields: req.queryConfig.fields,
    filters,
    pagination: req.queryConfig.pagination,
    context,
  })

  const variants: any[] = products.flatMap((product) => product.variants);


  if (withInventoryQuantity) {
    await wrapVariantsWithInventoryQuantityForSalesChannel(
      req,
      variants
      // products.map((product) => product.variants).flat(1)
    )
  }

  await wrapVariantsWithSellerPricing(req.scope, variants, req.pricingContext);
  await dataNormalization(req, products);
  await wrapProductsWithTaxPrices(req, products)

  res.json({
    products,
    count: metadata!.estimate_count,
    estimate_count: metadata!.estimate_count,
    offset: metadata!.skip,
    limit: metadata!.take,
  })
}

// async function getProducts(req, res) {
//   const remoteQuery = req.scope.resolve(utils_1.ContainerRegistrationKeys.REMOTE_QUERY);
//   const context = {};
//   const withInventoryQuantity = req.queryConfig.fields.some((field) => field.includes("variants.inventory_quantity"));
//   if (withInventoryQuantity) {
//       req.queryConfig.fields = req.queryConfig.fields.filter((field) => !field.includes("variants.inventory_quantity"));
//   }
//   if ((0, utils_1.isPresent)(req.pricingContext)) {
//       context["variants.calculated_price"] = {
//           context: req.pricingContext,
//       };
//   }
//   const queryObject = (0, utils_1.remoteQueryObjectFromString)({
//       entryPoint: "product",
//       variables: {
//           filters: req.filterableFields,
//           ...req.queryConfig.pagination,
//           ...context,
//       },
//       fields: req.queryConfig.fields,
//   });
//   const { rows: products, metadata } = await remoteQuery(queryObject);
//   if (withInventoryQuantity) {
//       await (0, middlewares_1.wrapVariantsWithInventoryQuantityForSalesChannel)(req, products.map((product) => product.variants).flat(1));
//   }
//   await (0, helpers_1.wrapProductsWithTaxPrices)(req, products);
//   res.json({
//       products,
//       count: metadata.count,
//       offset: metadata.skip,
//       limit: metadata.take,
//   });
// }

async function getProducts(
  req: RequestWithContext<HttpTypes.StoreProductListParams>,
  res: MedusaResponse<HttpTypes.StoreProductListResponse>
) {
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const context: Record<string, any> = {};

  const withInventoryQuantity = req.queryConfig.fields.some((field) =>
    field.includes("variants.inventory_quantity")
  );

  if (withInventoryQuantity) {
    req.queryConfig.fields = req.queryConfig.fields.filter(
      (field) => !field.includes("variants.inventory_quantity")
    );
  }

  if (isPresent(req.pricingContext)) {
    // context["variants"] ??= {}
    context["variants.calculated_price"] = {
      context: req.pricingContext,
    };
  }

  const filters: Record<string, any> = req.filterableFields
  if (isPresent(filters.sales_channel_id)) {
    const salesChannelIds = filters.sales_channel_id

    filters["sales_channels"] ??= {}
    filters["sales_channels"]["id"] = salesChannelIds

    delete filters.sales_channel_id
  }

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "product",
    variables: {
      filters: req.filterableFields,
      ...req.queryConfig.pagination,
      ...context,
    },
    fields: req.queryConfig.fields,
  });

  const { rows: products, metadata } = await remoteQuery(queryObject);

  const variants = products.flatMap((product) => product.variants);

  if (withInventoryQuantity) {
    await wrapVariantsWithInventoryQuantityForSalesChannel(req, variants);
  }

  // Apply seller pricing middleware - this is the new part
  await wrapVariantsWithSellerPricing(req.scope, variants, req.pricingContext);
  await dataNormalization(req, products);
  await wrapProductsWithTaxPrices(req, products);

  // Transform relative image paths to full URLs for frontend consumption, with resolution support
  const resolution = req.filterableFields?.resolution as string | undefined;
  transformProductImageUrlsWithResolution(products, resolution, transformProductImageUrls);

  if (req.auth_context?.actor_id) {
    await addWishlistFlagToProducts(req as AuthenticatedMedusaRequest, products);
  }

  res.json({
    products,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  });
}
