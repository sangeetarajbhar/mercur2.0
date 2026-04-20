import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

const INDIA_COUNTRIES = ["in"]

export default async function seedStoreConfig({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // 1) Sales Channel
  logger.info("Creating Zilo Sales Channel...")
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  let [salesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Zilo Sales Channel",
  })

  if (!salesChannel) {
    const {
      result: [salesChannelResult],
    } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [{ name: "Zilo Sales Channel" }],
      },
    })
    salesChannel = salesChannelResult
    logger.info(`Sales channel created: ${salesChannel.id}`)
  } else {
    logger.info("Sales channel already exists, skipping.")
  }

  // 2) Region: India (INR)
  logger.info("Creating India region (INR)...")
  const regionService = container.resolve(Modules.REGION)
  let [region] = await regionService.listRegions({ name: "India" })

  if (!region) {
    const {
      result: [regionResult],
    } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "India",
            currency_code: "inr",
            countries: INDIA_COUNTRIES,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    region = regionResult

    // Tax region for India
    const taxModule = container.resolve(Modules.TAX)
    const existingTaxRegions = await taxModule.listTaxRegions({ country_code: "in" })
    if (!existingTaxRegions.length) {
      await createTaxRegionsWorkflow(container).run({
        input: INDIA_COUNTRIES.map((country_code) => ({
          country_code,
          provider_id: "tp_system",
        })),
      })
      logger.info("India tax region created.")
    } else {
      logger.info("India tax region already exists, skipping.")
    }

    logger.info(`India region created: ${region.id}`)
  } else {
    logger.info("India region already exists, skipping.")
  }

  // 3) Store: set INR as default currency, link sales channel + region
  logger.info("Updating store with INR currency and India region...")
  const storeModuleService = container.resolve(Modules.STORE)
  const [store] = await storeModuleService.listStores()

  if (!store) {
    logger.warn("No store found, skipping store update.")
  } else {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            {
              currency_code: "inr",
              is_default: true,
            },
          ],
          default_sales_channel_id: salesChannel.id,
          default_region_id: region.id,
        },
      },
    })
    logger.info(`Store updated: ${store.id}`)
  }

  // 4) Publishable API key linked to sales channel
  logger.info("Creating publishable API key...")
  const apiKeyService = container.resolve(Modules.API_KEY)
  let [apiKey] = await apiKeyService.listApiKeys({ type: "publishable" })

  if (!apiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Default publishable key",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    })
    apiKey = publishableApiKeyResult
    logger.info(`Publishable API key created: ${apiKey.token}`)
  } else {
    logger.info("Publishable API key already exists, skipping.")
  }

  try {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: apiKey.id,
        add: [salesChannel.id],
      },
    })
    logger.info("Sales channel linked to API key.")
  } catch (error: unknown) {
    if (!(error instanceof Error && error.message.includes("already"))) {
      throw error
    }
    logger.info("Sales channel already linked to API key, skipping.")
  }

  logger.info("=== Seed store config complete ===")
  logger.info(`Sales Channel: Zilo Sales Channel (${salesChannel.id})`)
  logger.info(`Region: India / INR (${region.id})`)
  logger.info(`Store: ${store?.id ?? "not found"}`)
  logger.info(`Publishable API Key: ${apiKey.token}`)
}
