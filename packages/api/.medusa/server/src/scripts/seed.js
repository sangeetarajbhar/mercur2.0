"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = seedDemoData;
const utils_1 = require("@medusajs/framework/utils");
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
const types_1 = require("@mercurjs/types");
const updateStoreCurrencies = (0, workflows_sdk_1.createWorkflow)("update-store-currencies", (input) => {
    const normalizedInput = (0, workflows_sdk_1.transform)({ input }, (data) => {
        return {
            selector: { id: data.input.store_id },
            update: {
                supported_currencies: data.input.supported_currencies.map((currency) => {
                    return {
                        currency_code: currency.currency_code,
                        is_default: currency.is_default ?? false,
                    };
                }),
            },
        };
    });
    const stores = (0, core_flows_1.updateStoresStep)(normalizedInput);
    return new workflows_sdk_1.WorkflowResponse(stores);
});
async function seedDemoData({ container }) {
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    const link = container.resolve(utils_1.ContainerRegistrationKeys.LINK);
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const fulfillmentModuleService = container.resolve(utils_1.Modules.FULFILLMENT);
    const salesChannelModuleService = container.resolve(utils_1.Modules.SALES_CHANNEL);
    const storeModuleService = container.resolve(utils_1.Modules.STORE);
    const countries = ["gb", "de", "dk", "se", "fr", "es", "it"];
    logger.info("Seeding store data...");
    const [store] = await storeModuleService.listStores();
    let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
        name: "Default Sales Channel",
    });
    if (!defaultSalesChannel.length) {
        // create the default sales channel
        const { result: salesChannelResult } = await (0, core_flows_1.createSalesChannelsWorkflow)(container).run({
            input: {
                salesChannelsData: [
                    {
                        name: "Default Sales Channel",
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
                    currency_code: "eur",
                    is_default: true,
                },
                {
                    currency_code: "usd",
                },
            ],
        },
    });
    await (0, core_flows_1.updateStoresWorkflow)(container).run({
        input: {
            selector: { id: store.id },
            update: {
                default_sales_channel_id: defaultSalesChannel[0].id,
            },
        },
    });
    logger.info("Seeding region data...");
    const regionModuleService = container.resolve(utils_1.Modules.REGION);
    // Check if any of the countries are already assigned to a region
    const existingRegions = await regionModuleService.listRegions({}, {
        relations: ["countries"],
    });
    const assignedCountries = new Set();
    for (const r of existingRegions) {
        for (const c of r.countries || []) {
            assignedCountries.add(c.iso_2);
        }
    }
    const unassignedCountries = countries.filter(c => !assignedCountries.has(c));
    let region;
    if (unassignedCountries.length === 0) {
        // All countries already assigned - find the region that has most of our countries
        region = existingRegions.find(r => r.countries?.some(c => countries.includes(c.iso_2))) || existingRegions[0];
        logger.info("Countries already assigned to a region, skipping region creation.");
    }
    else if (unassignedCountries.length < countries.length) {
        // Some countries assigned, some not - only create with unassigned ones
        logger.info(`Some countries already assigned, creating region with: ${unassignedCountries.join(", ")}`);
        const { result: regionResult } = await (0, core_flows_1.createRegionsWorkflow)(container).run({
            input: {
                regions: [
                    {
                        name: "Europe",
                        currency_code: "eur",
                        countries: unassignedCountries,
                        payment_providers: ["pp_system_default"],
                    },
                ],
            },
        });
        region = regionResult[0];
    }
    else {
        // No countries assigned - create full region
        const { result: regionResult } = await (0, core_flows_1.createRegionsWorkflow)(container).run({
            input: {
                regions: [
                    {
                        name: "Europe",
                        currency_code: "eur",
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
    const taxModuleService = container.resolve(utils_1.Modules.TAX);
    const existingTaxRegions = await taxModuleService.listTaxRegions();
    const existingCountryCodes = new Set(existingTaxRegions.map((tr) => tr.country_code));
    const countriesToCreate = countries.filter((c) => !existingCountryCodes.has(c));
    if (countriesToCreate.length > 0) {
        await (0, core_flows_1.createTaxRegionsWorkflow)(container).run({
            input: countriesToCreate.map((country_code) => ({
                country_code,
                provider_id: "tp_system",
            })),
        });
    }
    else {
        logger.info("Tax regions already exist, skipping.");
    }
    logger.info("Finished seeding tax regions.");
    logger.info("Seeding stock location data...");
    const stockLocationModule = container.resolve(utils_1.Modules.STOCK_LOCATION);
    const existingStockLocations = await stockLocationModule.listStockLocations({
        name: "European Warehouse",
    });
    let stockLocation;
    if (existingStockLocations.length) {
        stockLocation = existingStockLocations[0];
        logger.info("Stock location 'European Warehouse' already exists, skipping.");
    }
    else {
        const { result: stockLocationResult } = await (0, core_flows_1.createStockLocationsWorkflow)(container).run({
            input: {
                locations: [
                    {
                        name: "European Warehouse",
                        address: {
                            city: "Copenhagen",
                            country_code: "DK",
                            address_1: "",
                        },
                    },
                ],
            },
        });
        stockLocation = stockLocationResult[0];
    }
    await (0, core_flows_1.updateStoresWorkflow)(container).run({
        input: {
            selector: { id: store.id },
            update: {
                default_location_id: stockLocation.id,
            },
        },
    });
    // Link stock location to fulfillment provider (idempotent)
    try {
        await link.create({
            [utils_1.Modules.STOCK_LOCATION]: {
                stock_location_id: stockLocation.id,
            },
            [utils_1.Modules.FULFILLMENT]: {
                fulfillment_provider_id: "manual_manual",
            },
        });
    }
    catch (error) {
        // Ignore if link already exists
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
        const { result: shippingProfileResult } = await (0, core_flows_1.createShippingProfilesWorkflow)(container).run({
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
        name: "European Warehouse delivery",
    });
    let fulfillmentSet;
    if (existingFulfillmentSets.length) {
        fulfillmentSet = existingFulfillmentSets[0];
        logger.info("Fulfillment set 'European Warehouse delivery' already exists, skipping.");
    }
    else {
        fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
            name: "European Warehouse delivery",
            type: "shipping",
            service_zones: [
                {
                    name: "Europe",
                    geo_zones: [
                        {
                            country_code: "gb",
                            type: "country",
                        },
                        {
                            country_code: "de",
                            type: "country",
                        },
                        {
                            country_code: "dk",
                            type: "country",
                        },
                        {
                            country_code: "se",
                            type: "country",
                        },
                        {
                            country_code: "fr",
                            type: "country",
                        },
                        {
                            country_code: "es",
                            type: "country",
                        },
                        {
                            country_code: "it",
                            type: "country",
                        },
                    ],
                },
            ],
        });
        try {
            await link.create({
                [utils_1.Modules.STOCK_LOCATION]: {
                    stock_location_id: stockLocation.id,
                },
                [utils_1.Modules.FULFILLMENT]: {
                    fulfillment_set_id: fulfillmentSet.id,
                },
            });
        }
        catch (error) {
            if (!(error instanceof Error && error.message.includes("already exists"))) {
                throw error;
            }
        }
        await (0, core_flows_1.createShippingOptionsWorkflow)(container).run({
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
                            currency_code: "usd",
                            amount: 10,
                        },
                        {
                            currency_code: "eur",
                            amount: 10,
                        },
                        {
                            region_id: region.id,
                            amount: 10,
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
                            currency_code: "usd",
                            amount: 10,
                        },
                        {
                            currency_code: "eur",
                            amount: 10,
                        },
                        {
                            region_id: region.id,
                            amount: 10,
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
    // Link sales channel to stock location (idempotent - workflow handles duplicates)
    try {
        await (0, core_flows_1.linkSalesChannelsToStockLocationWorkflow)(container).run({
            input: {
                id: stockLocation.id,
                add: [defaultSalesChannel[0].id],
            },
        });
    }
    catch (error) {
        // Ignore if link already exists
        if (!(error instanceof Error && error.message.includes("already"))) {
            throw error;
        }
        logger.info("Sales channel already linked to stock location, skipping.");
    }
    logger.info("Finished seeding stock location data.");
    logger.info("Seeding publishable API key data...");
    let publishableApiKey = null;
    const { data } = await query.graph({
        entity: "api_key",
        fields: ["id"],
        filters: {
            type: "publishable",
        },
    });
    publishableApiKey = data?.[0];
    if (!publishableApiKey) {
        const { result: [publishableApiKeyResult], } = await (0, core_flows_1.createApiKeysWorkflow)(container).run({
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
        publishableApiKey = publishableApiKeyResult;
    }
    // Link sales channel to API key (idempotent)
    try {
        await (0, core_flows_1.linkSalesChannelsToApiKeyWorkflow)(container).run({
            input: {
                id: publishableApiKey.id,
                add: [defaultSalesChannel[0].id],
            },
        });
    }
    catch (error) {
        // Ignore if link already exists
        if (!(error instanceof Error && error.message.includes("already"))) {
            throw error;
        }
        logger.info("Sales channel already linked to API key, skipping.");
    }
    logger.info("Finished seeding publishable API key data.");
    logger.info("Seeding product data...");
    const productCategoryModule = container.resolve(utils_1.Modules.PRODUCT);
    const categoryNames = ["Shirts", "Sweatshirts", "Pants", "Merch"];
    const existingCategories = await productCategoryModule.listProductCategories({
        name: categoryNames,
    });
    let categoryResult;
    if (existingCategories.length === categoryNames.length) {
        categoryResult = existingCategories;
        logger.info("Product categories already exist, skipping.");
    }
    else {
        const categoriesToCreate = categoryNames.filter((name) => !existingCategories.find((c) => c.name === name));
        const { result: newCategories } = await (0, core_flows_1.createProductCategoriesWorkflow)(container).run({
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
    }
    else {
        await (0, core_flows_1.createProductsWorkflow)(container).run({
            input: {
                products: [
                    {
                        title: "Medusa T-Shirt",
                        category_ids: [
                            categoryResult.find((cat) => cat.name === "Shirts").id,
                        ],
                        description: "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
                        handle: "t-shirt",
                        weight: 400,
                        status: utils_1.ProductStatus.PUBLISHED,
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
                                options: {
                                    Size: "S",
                                    Color: "Black",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "S / White",
                                sku: "SHIRT-S-WHITE",
                                options: {
                                    Size: "S",
                                    Color: "White",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "M / Black",
                                sku: "SHIRT-M-BLACK",
                                options: {
                                    Size: "M",
                                    Color: "Black",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "M / White",
                                sku: "SHIRT-M-WHITE",
                                options: {
                                    Size: "M",
                                    Color: "White",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "L / Black",
                                sku: "SHIRT-L-BLACK",
                                options: {
                                    Size: "L",
                                    Color: "Black",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "L / White",
                                sku: "SHIRT-L-WHITE",
                                options: {
                                    Size: "L",
                                    Color: "White",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "XL / Black",
                                sku: "SHIRT-XL-BLACK",
                                options: {
                                    Size: "XL",
                                    Color: "Black",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "XL / White",
                                sku: "SHIRT-XL-WHITE",
                                options: {
                                    Size: "XL",
                                    Color: "White",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                        ],
                        sales_channels: [
                            {
                                id: defaultSalesChannel[0].id,
                            },
                        ],
                    },
                    {
                        title: "Medusa Sweatshirt",
                        category_ids: [
                            categoryResult.find((cat) => cat.name === "Sweatshirts").id,
                        ],
                        description: "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
                        handle: "sweatshirt",
                        weight: 400,
                        status: utils_1.ProductStatus.PUBLISHED,
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
                                options: {
                                    Size: "S",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "M",
                                sku: "SWEATSHIRT-M",
                                options: {
                                    Size: "M",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "L",
                                sku: "SWEATSHIRT-L",
                                options: {
                                    Size: "L",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "XL",
                                sku: "SWEATSHIRT-XL",
                                options: {
                                    Size: "XL",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                        ],
                        sales_channels: [
                            {
                                id: defaultSalesChannel[0].id,
                            },
                        ],
                    },
                    {
                        title: "Medusa Sweatpants",
                        category_ids: [
                            categoryResult.find((cat) => cat.name === "Pants").id,
                        ],
                        description: "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
                        handle: "sweatpants",
                        weight: 400,
                        status: utils_1.ProductStatus.PUBLISHED,
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
                                options: {
                                    Size: "S",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "M",
                                sku: "SWEATPANTS-M",
                                options: {
                                    Size: "M",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "L",
                                sku: "SWEATPANTS-L",
                                options: {
                                    Size: "L",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "XL",
                                sku: "SWEATPANTS-XL",
                                options: {
                                    Size: "XL",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                        ],
                        sales_channels: [
                            {
                                id: defaultSalesChannel[0].id,
                            },
                        ],
                    },
                    {
                        title: "Medusa Shorts",
                        category_ids: [
                            categoryResult.find((cat) => cat.name === "Merch").id,
                        ],
                        description: "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
                        handle: "shorts",
                        weight: 400,
                        status: utils_1.ProductStatus.PUBLISHED,
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
                                options: {
                                    Size: "S",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "M",
                                sku: "SHORTS-M",
                                options: {
                                    Size: "M",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "L",
                                sku: "SHORTS-L",
                                options: {
                                    Size: "L",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                            {
                                title: "XL",
                                sku: "SHORTS-XL",
                                options: {
                                    Size: "XL",
                                },
                                prices: [
                                    {
                                        amount: 10,
                                        currency_code: "eur",
                                    },
                                    {
                                        amount: 15,
                                        currency_code: "usd",
                                    },
                                ],
                            },
                        ],
                        sales_channels: [
                            {
                                id: defaultSalesChannel[0].id,
                            },
                        ],
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
    const inventoryModule = container.resolve(utils_1.Modules.INVENTORY);
    const existingLevels = await inventoryModule.listInventoryLevels({
        location_id: stockLocation.id,
    });
    const existingItemIds = new Set(existingLevels.map((l) => l.inventory_item_id));
    const inventoryLevels = [];
    for (const inventoryItem of inventoryItems) {
        if (!existingItemIds.has(inventoryItem.id)) {
            const inventoryLevel = {
                location_id: stockLocation.
                    id,
                stocked_quantity: 1000000,
                inventory_item_id: inventoryItem.id,
            };
            inventoryLevels.push(inventoryLevel);
        }
    }
    if (inventoryLevels.length > 0) {
        await (0, core_flows_1.createInventoryLevelsWorkflow)(container).run({
            input: {
                inventory_levels: inventoryLevels,
            },
        });
    }
    else {
        logger.info("Inventory levels already exist, skipping.");
    }
    logger.info("Finished seeding inventory levels data.");
    logger.info("Seeding seller data...");
    const sellerEmail = "seller@medusa-test.com";
    const sellerModule = container.resolve(types_1.MercurModules.SELLER);
    const authModule = container.resolve(utils_1.Modules.AUTH);
    const existingSellers = await sellerModule.listSellers({
        email: sellerEmail,
    });
    let seller;
    if (existingSellers.length) {
        seller = existingSellers[0];
        logger.info("Seller already exists, skipping creation.");
    }
    else {
        seller = await sellerModule.createSellers({
            name: "Test Seller",
            email: sellerEmail,
        });
        const authResult = await authModule.register("emailpass", {
            body: { email: sellerEmail, password: "supersecret" },
        });
        if (!authResult.success || !authResult.authIdentity) {
            throw new Error(`Failed to register seller auth identity: ${authResult.error}`);
        }
        await authModule.updateAuthIdentities({
            id: authResult.authIdentity.id,
            app_metadata: {
                seller_id: seller.id,
            },
        });
        logger.info("Seller created with email: seller@medusa-test.com / password: supersecret");
    }
    // Link entities to seller (idempotent — runs every time)
    logger.info("Linking products to seller...");
    for (const product of seededProducts) {
        try {
            await link.create({
                [utils_1.Modules.PRODUCT]: {
                    product_id: product.id,
                },
                [types_1.MercurModules.SELLER]: {
                    seller_id: seller.id,
                },
            });
        }
        catch (error) {
            if (!(error instanceof Error && error.message.includes("already exists"))) {
                throw error;
            }
        }
    }
    logger.info("Linking stock location to seller...");
    try {
        await link.create({
            [utils_1.Modules.STOCK_LOCATION]: {
                stock_location_id: stockLocation.id,
            },
            [types_1.MercurModules.SELLER]: {
                seller_id: seller.id,
            },
        });
    }
    catch (error) {
        if (!(error instanceof Error && error.message.includes("already exists"))) {
            throw error;
        }
    }
    logger.info("Linking fulfillment set to seller...");
    try {
        await link.create({
            [types_1.MercurModules.SELLER]: {
                seller_id: seller.id,
            },
            [utils_1.Modules.FULFILLMENT]: {
                fulfillment_set_id: fulfillmentSet.id,
            },
        });
    }
    catch (error) {
        if (!(error instanceof Error && error.message.includes("already exists"))) {
            throw error;
        }
    }
    logger.info("Linking service zones to seller...");
    const fulfillmentSetWithZones = await fulfillmentModuleService.retrieveFulfillmentSet(fulfillmentSet.id, { relations: ["service_zones"] });
    for (const zone of fulfillmentSetWithZones.service_zones) {
        try {
            await link.create({
                [types_1.MercurModules.SELLER]: {
                    seller_id: seller.id,
                },
                [utils_1.Modules.FULFILLMENT]: {
                    service_zone_id: zone.id,
                },
            });
        }
        catch (error) {
            if (!(error instanceof Error && error.message.includes("already exists"))) {
                throw error;
            }
        }
    }
    logger.info("Linking shipping profile to seller...");
    try {
        await link.create({
            [utils_1.Modules.FULFILLMENT]: {
                shipping_profile_id: shippingProfile.id,
            },
            [types_1.MercurModules.SELLER]: {
                seller_id: seller.id,
            },
        });
    }
    catch (error) {
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
                [utils_1.Modules.FULFILLMENT]: {
                    shipping_option_id: option.id,
                },
                [types_1.MercurModules.SELLER]: {
                    seller_id: seller.id,
                },
            });
        }
        catch (error) {
            if (!(error instanceof Error && error.message.includes("already exists"))) {
                throw error;
            }
        }
    }
    logger.info("Finished seeding seller data.");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9zY3JpcHRzL3NlZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUE4REEsK0JBZ29DQztBQXpyQ0QscURBSW1DO0FBQ25DLHFFQUkyQztBQUMzQyw0REFlcUM7QUFFckMsMkNBQWdEO0FBRWhELE1BQU0scUJBQXFCLEdBQUcsSUFBQSw4QkFBYyxFQUMxQyx5QkFBeUIsRUFDekIsQ0FBQyxLQUdBLEVBQUUsRUFBRTtJQUNILE1BQU0sZUFBZSxHQUFHLElBQUEseUJBQVMsRUFBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDcEQsT0FBTztZQUNMLFFBQVEsRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRTtZQUNyQyxNQUFNLEVBQUU7Z0JBQ04sb0JBQW9CLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQ3ZELENBQUMsUUFBUSxFQUFFLEVBQUU7b0JBQ1gsT0FBTzt3QkFDTCxhQUFhLEVBQUUsUUFBUSxDQUFDLGFBQWE7d0JBQ3JDLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVSxJQUFJLEtBQUs7cUJBQ3pDLENBQUM7Z0JBQ0osQ0FBQyxDQUNGO2FBQ0Y7U0FDRixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLE1BQU0sR0FBRyxJQUFBLDZCQUFnQixFQUFDLGVBQWUsQ0FBQyxDQUFDO0lBRWpELE9BQU8sSUFBSSxnQ0FBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQ0YsQ0FBQztBQUVhLEtBQUssVUFBVSxZQUFZLENBQUMsRUFBRSxTQUFTLEVBQVk7SUFDaEUsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNuRSxNQUFNLElBQUksR0FBRyxTQUFTLENB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