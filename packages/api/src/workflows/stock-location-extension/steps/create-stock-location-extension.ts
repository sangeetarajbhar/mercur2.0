import { MedusaError } from "@medusajs/framework/utils";
import {createStep, StepResponse} from "@medusajs/framework/workflows-sdk";
import {CreateStockLocationExtensionDTO} from "../../../modules/stock-location-extension/types/mutations";
import StockLocationExtensionModuleService from "../../../modules/stock-location-extension/service";
import {STOCK_LOCATION_EXTENSION_MODULE} from "../../../modules/stock-location-extension";

export const createStockLocationExtensionStep = createStep(
  'create-stock-location-extension',
  async (data: CreateStockLocationExtensionDTO, { container }) => {
    const service = container.resolve<StockLocationExtensionModuleService>(STOCK_LOCATION_EXTENSION_MODULE)
    const stockLocationExtension = await service.createStockLocationExtensions(data)

    return new StepResponse(stockLocationExtension, stockLocationExtension.id)
  },
  async (stockLocationExtensionId: string, { container }) => {
    if (!stockLocationExtensionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Stock location extension ID is required for compensation'
      )
    }

    const service = container.resolve<StockLocationExtensionModuleService>(STOCK_LOCATION_EXTENSION_MODULE)
    await service.softDeleteStockLocationExtensions(stockLocationExtensionId)
  }
)
