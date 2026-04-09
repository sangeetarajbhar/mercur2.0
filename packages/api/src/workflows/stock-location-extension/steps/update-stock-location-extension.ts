import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { UpdateStockLocationExtensionDTO } from '../../../modules/stock-location-extension/types/mutations'
import StockLocationExtensionModuleService from '../../../modules/stock-location-extension/service'
import { STOCK_LOCATION_EXTENSION_MODULE } from '../../../modules/stock-location-extension'

export const updateStockLocationExtensionStep = createStep(
  'update-stock-location-extension',
  async (input: UpdateStockLocationExtensionDTO, { container }) => {
    const service = container.resolve<StockLocationExtensionModuleService>(
      STOCK_LOCATION_EXTENSION_MODULE
    )

    const [previousData] = await service.listStockLocationExtensions({
      id: input.id
    })

    const updatedExtension = await service.updateStockLocationExtensions(input)

    // Ensure rollback data conforms to UpdateStockLocationExtensionDTO type
    const rollbackData: UpdateStockLocationExtensionDTO = {
      id: previousData.id,
      location_type: previousData.location_type,
      address_type: previousData.address_type,
      latitude: previousData.latitude,
      longitude: previousData.longitude,
      partner_id: previousData.partner_id,
      return_location_id: previousData.return_location_id,
      status: previousData.status,
      servisibility_status: previousData.servisibility_status,
      start_time: previousData.start_time,
      end_time: previousData.end_time,
      updated_by: previousData?.updated_by || ''
    }

    return new StepResponse(updatedExtension, rollbackData)
  },
  async (rollbackData: UpdateStockLocationExtensionDTO, { container }) => {
    const service = container.resolve<StockLocationExtensionModuleService>(
      STOCK_LOCATION_EXTENSION_MODULE
    )

    await service.updateStockLocationExtensions(rollbackData)
  }
)
