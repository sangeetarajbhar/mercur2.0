import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  fetchStockLocationExtensionsByStockLocationId,
  StockLocationExtensionData,
} from "../../../modules/stock-location-extension/utils/fetch-stock-location-extensions"

export type FetchStockLocationExtensionsStepInput = {
  stock_location_id: string
}

export type FetchStockLocationExtensionsStepOutput = {
  data: StockLocationExtensionData[]
}

export const fetchStockLocationExtensionsStep = createStep(
  "fetch-stock-location-extensions",
  async (
    input: FetchStockLocationExtensionsStepInput,
    { container }
  ): Promise<StepResponse<FetchStockLocationExtensionsStepOutput>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const data = await fetchStockLocationExtensionsByStockLocationId(
      query,
      input.stock_location_id
    )

    return new StepResponse({ data })
  }
)
