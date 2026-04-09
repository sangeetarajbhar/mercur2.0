import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { UpdateStockLocationContactDTO } from '../../../modules/stock-location-contact/types/mutations'
import StockLocationContactModuleService from '../../../modules/stock-location-contact/service'
import { STOCK_LOCATION_CONTACT_MODULE } from '../../../modules/stock-location-contact'

export const updateStockLocationContactStep = createStep(
  'update-stock-location-contact',
  async (input: UpdateStockLocationContactDTO, { container }) => {
    const service = container.resolve<StockLocationContactModuleService>(
      STOCK_LOCATION_CONTACT_MODULE
    )

    const [previousData] = await service.listStockLocationContacts({
      id: input.id
    })
    const updatedContact = await service.updateStockLocationContacts(input)

    return new StepResponse(updatedContact, previousData)
  },
  async (previousData: UpdateStockLocationContactDTO, { container }) => {
    const service = container.resolve<StockLocationContactModuleService>(
      STOCK_LOCATION_CONTACT_MODULE
    )

    await service.updateStockLocationContacts(previousData)
  }
)
