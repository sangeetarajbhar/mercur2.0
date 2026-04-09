import { MedusaError } from "@medusajs/framework/utils";
import {createStep, StepResponse} from "@medusajs/framework/workflows-sdk";
import {CreateStockLocationDocumentDTO} from "../../../modules/stock-location-document/types/mutations";
import StockLocationDocumentModuleService from "../../../modules/stock-location-document/service";
import {STOCK_LOCATION_DOCUMENT_MODULE} from "../../../modules/stock-location-document";

export const createStockLocationDocumentStep = createStep(
  'create-stock-location-document',
  async (data: CreateStockLocationDocumentDTO, { container }) => {
    const service = container.resolve<StockLocationDocumentModuleService>(STOCK_LOCATION_DOCUMENT_MODULE)
    const stockLocationDocument = await service.createStockLocationDocuments(data)

    return new StepResponse(stockLocationDocument, stockLocationDocument.id)
  },
  async (stockLocationDocumentId: string, { container }) => {
    if (!stockLocationDocumentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Stock location document ID is required for compensation'
      )
    }

    const service = container.resolve<StockLocationDocumentModuleService>(STOCK_LOCATION_DOCUMENT_MODULE)
    await service.softDeleteStockLocationDocuments(stockLocationDocumentId)
  }
)
