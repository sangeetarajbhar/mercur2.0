import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { UpdateStockLocationDocumentDTO } from '../../../modules/stock-location-document/types/mutations'
import StockLocationDocumentModuleService from '../../../modules/stock-location-document/service'
import { STOCK_LOCATION_DOCUMENT_MODULE } from '../../../modules/stock-location-document'

export const updateStockLocationDocumentStep = createStep(
  'update-stock-location-document',
  async (input: UpdateStockLocationDocumentDTO, { container }) => {
    const service = container.resolve<StockLocationDocumentModuleService>(
      STOCK_LOCATION_DOCUMENT_MODULE
    )

    const [previousData] = await service.listStockLocationDocuments({
      id: input.id
    })

    const updatedDocument = await service.updateStockLocationDocuments(input)

    const rollbackData: UpdateStockLocationDocumentDTO = {
      id: previousData.id,
      document_type: previousData.document_type,
      document_number: previousData.document_number,
      pdf_url: previousData.pdf_url
    }

    return new StepResponse(updatedDocument, rollbackData)
  },
  async (previousData: UpdateStockLocationDocumentDTO, { container }) => {
    const service = container.resolve<StockLocationDocumentModuleService>(
      STOCK_LOCATION_DOCUMENT_MODULE
    )

    await service.updateStockLocationDocuments(previousData)
  }
)
