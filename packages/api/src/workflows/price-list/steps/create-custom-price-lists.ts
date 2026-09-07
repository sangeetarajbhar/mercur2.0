import {
  CreatePriceListDTO,
  CreatePriceListsWorkflowStepDTO,
  IPricingModuleService,
  PriceListDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createPriceListPricesWorkflow } from "@medusajs/medusa/core-flows"

import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

export const createPriceListsStepId = "create-custom-price-lists"

const PRICE_LIST_BATCH_SIZE = 10
const PRICE_BATCH_SIZE = 100

type PriceWithVariantId = NonNullable<CreatePriceListDTO["prices"]>[0] & {
  _variant_id?: string
}

function createReverseMapping(
  variantPriceMap: Record<string, string>
): Record<string, string> {
  const reverseMap: Record<string, string> = {}
  Object.entries(variantPriceMap).forEach(([variantId, priceSetId]) => {
    reverseMap[priceSetId] = variantId
  })
  return reverseMap
}

function adjustStartDate(dateString: string | null | undefined): string | null | undefined {
  if (!dateString) return dateString

  const inputDate = new Date(dateString)
  if (isNaN(inputDate.getTime())) return dateString

  // Get the date part from input (year, month, day)
  const year = inputDate.getFullYear()
  const month = inputDate.getMonth()
  const day = inputDate.getDate()

  // Use current time
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  const milliseconds = now.getMilliseconds()

  // Create new date with input date but current time
  const adjustedDate = new Date(year, month, day, hours, minutes, seconds, milliseconds)
  return adjustedDate.toISOString()
}

function adjustEndDate(dateString: string | null | undefined): string | null | undefined {
  if (!dateString) return dateString

  const inputDate = new Date(dateString)
  if (isNaN(inputDate.getTime())) return dateString

  // Get the date part from input (year, month, day)
  const year = inputDate.getFullYear()
  const month = inputDate.getMonth()
  const day = inputDate.getDate()

  // Set time to end of day (23:59:59.999)
  const adjustedDate = new Date(year, month, day, 23, 59, 59, 999)
  return adjustedDate.toISOString()
}

function preparePriceListData(
  data: CreatePriceListsWorkflowStepDTO["data"],
  variantPriceMap: Record<string, string>
): CreatePriceListDTO[] {
  console.log("[preparePriceListData] variantPriceMap:", variantPriceMap)

  return data.map((priceListDTO) => {
    const { prices = [], starts_at, ends_at, ...rest } = priceListDTO
    return {
      ...rest,
      // Adjust start date to use current time
      starts_at: adjustStartDate(starts_at),
      // Adjust end date to use end of day
      ends_at: adjustEndDate(ends_at),
      prices: prices.map((price) => {
        const variantId = (price as any).variant_id
        const priceSetId = variantPriceMap[variantId]

        if (!priceSetId) {
          throw new Error(
            `Missing price_set_id for variant_id: ${variantId || "undefined"} (variant_id: ${variantId || "unknown"}). ` +
              `Available variant_ids in map: ${Object.keys(variantPriceMap).join(", ")}`
          )
        }

        return {
          currency_code: price.currency_code,
          amount: price.amount,
          min_quantity: price.min_quantity,
          max_quantity: price.max_quantity,
          price_set_id: priceSetId,
          rules: price.rules,
          _variant_id: variantId,
        } as any
      }),
    }
  })
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Converts prices to workflow format with variant_id
 */
function convertPricesToWorkflowFormat(
  prices: PriceWithVariantId[],
  priceSetToVariantMap: Record<string, string>
) {
  return prices.map((price) => {
    const variantId = price._variant_id || priceSetToVariantMap[price.price_set_id!]
    if (!variantId) {
      throw new Error(`Cannot find variant_id for price_set_id: ${price.price_set_id}`)
    }
    return {
      currency_code: price.currency_code!,
      amount: price.amount!,
      min_quantity: price.min_quantity,
      max_quantity: price.max_quantity,
      variant_id: variantId,
      rules: price.rules,
    }
  })
}

/**
 * Adds a single batch of prices to a price list
 */
async function addPriceBatch(
  priceListId: string,
  priceBatch: PriceWithVariantId[],
  priceSetToVariantMap: Record<string, string>,
  container: any,
  batchIndex: number,
  totalBatches: number,
  priceListTitle: string
): Promise<void> {
  const workflowPrices = convertPricesToWorkflowFormat(priceBatch, priceSetToVariantMap)

  await createPriceListPricesWorkflow.run({
    container,
    input: {
      data: [{ id: priceListId, prices: workflowPrices }],
    },
  })

  console.log(
    `Added price batch ${batchIndex + 1}/${totalBatches} (${priceBatch.length} prices) to "${priceListTitle}"`
  )
}

/**
 * Adds remaining prices to price list in batches
 */
async function addRemainingPricesInBatches(
  priceList: PriceListDTO,
  remainingPrices: PriceWithVariantId[],
  priceSetToVariantMap: Record<string, string>,
  container: any,
  priceListTitle: string,
  totalPrices: number
): Promise<void> {
  if (remainingPrices.length === 0) return

  console.log(
    `Adding remaining ${remainingPrices.length}/${totalPrices} prices to "${priceListTitle}"...`
  )

  const priceBatches = chunkArray(remainingPrices, PRICE_BATCH_SIZE)

  for (let i = 0; i < priceBatches.length; i++) {
    try {
      await addPriceBatch(
        priceList.id,
        priceBatches[i],
        priceSetToVariantMap,
        container,
        i,
        priceBatches.length,
        priceListTitle
      )

      if (i < priceBatches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    } catch (error: unknown) {
      console.error(
        `Error adding price batch ${i + 1}/${priceBatches.length} to "${priceListTitle}":`,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : ""
      )
    }
  }
}

async function createSinglePriceList(
  priceListData: CreatePriceListDTO,
  priceSetToVariantMap: Record<string, string>,
  pricingModule: IPricingModuleService,
  container: any
): Promise<PriceListDTO> {
  const allPrices = (priceListData.prices || []) as PriceWithVariantId[]
  const totalPrices = allPrices.length
  const firstBatch = allPrices.slice(0, PRICE_BATCH_SIZE)
  const remaining = allPrices.slice(PRICE_BATCH_SIZE)

  const startTime = Date.now()

  // Create price list with first batch
  const [createdPriceList] = await pricingModule.createPriceLists([
    { ...priceListData, prices: firstBatch },
  ])

  // Add remaining prices in batches
  await addRemainingPricesInBatches(
    createdPriceList,
    remaining,
    priceSetToVariantMap,
    container,
    priceListData.title || "Untitled",
    totalPrices
  )

  const duration = Date.now() - startTime
  console.log(`Created "${priceListData.title}" with ${totalPrices} prices in ${duration}ms`)

  return createdPriceList
}

/**
 * Processes a batch of price lists
 */
async function processPriceListBatch(
  batch: CreatePriceListDTO[],
  priceSetToVariantMap: Record<string, string>,
  pricingModule: IPricingModuleService,
  container: any
): Promise<PriceListDTO[]> {
  const results: PriceListDTO[] = []

  for (const priceListData of batch) {
    try {
      const created = await createSinglePriceList(
        priceListData,
        priceSetToVariantMap,
        pricingModule,
        container
      )
      results.push(created)
    } catch (error: unknown) {
      console.error(
        `Error creating "${priceListData.title}":`,
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  return results
}

/**
 * This step creates price lists with batch processing support for large datasets.
 */
export const createCustomPriceListsStep = createStep(
  createPriceListsStepId,
  async (stepInput: CreatePriceListsWorkflowStepDTO, { container }) => {
    const { data, variant_price_map: variantPriceMap } = stepInput
    const pricingModule = container.resolve<IPricingModuleService>(Modules.PRICING)

    if (!data.length) {
      return new StepResponse([])
    }

    const priceSetToVariantMap = createReverseMapping(variantPriceMap)
    const preparedData = preparePriceListData(data, variantPriceMap)
    const batches = chunkArray(preparedData, PRICE_LIST_BATCH_SIZE)
    const allCreatedPriceLists: PriceListDTO[] = []

    console.log(`Processing ${data.length} price list(s) in ${batches.length} batch(es)`)

    for (let i = 0; i < batches.length; i++) {
      try {
        const created = await processPriceListBatch(
          batches[i],
          priceSetToVariantMap,
          pricingModule,
          container
        )
        allCreatedPriceLists.push(...created)

        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      } catch (error: unknown) {
        console.error(
          `Error processing batch ${i + 1}/${batches.length}:`,
          error instanceof Error ? error.message : String(error)
        )
      }
    }

    return new StepResponse(
      allCreatedPriceLists,
      allCreatedPriceLists.map((pl) => pl.id)
    )
  },
  async (createdPriceListIds, { container }) => {
    if (!createdPriceListIds?.length) return
    const pricingModule = container.resolve<IPricingModuleService>(Modules.PRICING)
    const batches = chunkArray(createdPriceListIds, 50)

    for (const batch of batches) {
      try {
        await pricingModule.deletePriceLists(batch)
      } catch (error) {
        console.error("Error deleting price list batch during rollback:", error)
      }
    }
  }
)
