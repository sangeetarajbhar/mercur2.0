import { MedusaError } from "@medusajs/framework/utils";
import {createStep, StepResponse} from "@medusajs/framework/workflows-sdk";
import {CreateStockLocationContactDTO} from "../../../modules/stock-location-contact/types/mutations";
import StockLocationContactModuleService from "../../../modules/stock-location-contact/service";
import {STOCK_LOCATION_CONTACT_MODULE} from "../../../modules/stock-location-contact";

export const createStockLocationContactStep = createStep(
  'create-stock-location-contact',
  async (input: CreateStockLocationContactDTO, { container }) => {
    const service = container.resolve<StockLocationContactModuleService>(STOCK_LOCATION_CONTACT_MODULE)
    const stockLocationContact = await service.createStockLocationContacts(input)

    return new StepResponse(stockLocationContact, stockLocationContact.id)
  },
  async (stockLocationContactId: string, { container }) => {
    if (!stockLocationContactId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Stock location contact ID is required for compensation'
      )
    }

    const service = container.resolve<StockLocationContactModuleService>(STOCK_LOCATION_CONTACT_MODULE)
    await service.softDeleteStockLocationContacts(stockLocationContactId)
  }
)
