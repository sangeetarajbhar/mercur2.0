import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { UpdateStockLocationSectionDTO } from '../../../modules/stock-location-section/types/mutations'
import StockLocationSectionModuleService from '../../../modules/stock-location-section/service'
import { STOCK_LOCATION_SECTION_MODULE } from '../../../modules/stock-location-section'

export const updateStockLocationSectionStep = createStep(
  'update-stock-location-section',
  async (input: UpdateStockLocationSectionDTO, { container }) => {
    const service = container.resolve<StockLocationSectionModuleService>(
      STOCK_LOCATION_SECTION_MODULE
    )

    const [previousData] = await service.listStockLocationSections({
      id: input.id
    })
    const updatedSection = await service.updateStockLocationSections(input)

    return new StepResponse(updatedSection, previousData)
  },
  async (previousData: UpdateStockLocationSectionDTO, { container }) => {
    const service = container.resolve<StockLocationSectionModuleService>(
      STOCK_LOCATION_SECTION_MODULE
    )

    await service.updateStockLocationSections(previousData)
  }
)
