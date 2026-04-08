import { MedusaError } from "@medusajs/framework/utils";
import {createStep, StepResponse} from "@medusajs/framework/workflows-sdk";
import {CreateStockLocationSectionDTO} from "../../../modules/stock-location-section/types/mutations";
import StockLocationSectionModuleService from "../../../modules/stock-location-section/service";
import {STOCK_LOCATION_SECTION_MODULE} from "../../../modules/stock-location-section";

export const createStockLocationSectionStep = createStep(
  'create-stock-location-section',
  async (data: CreateStockLocationSectionDTO, { container }) => {
    const service = container.resolve<StockLocationSectionModuleService>(STOCK_LOCATION_SECTION_MODULE)
    const stockLocationSection = await service.createStockLocationSections(data)

    return new StepResponse(stockLocationSection, stockLocationSection.id)
  },
  async (stockLocationSectionId: string, { container }) => {
    if (!stockLocationSectionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Stock location section ID is required for compensation'
      )
    }

    const service = container.resolve<StockLocationSectionModuleService>(STOCK_LOCATION_SECTION_MODULE)
    await service.softDeleteStockLocationSections(stockLocationSectionId)
  }
)
