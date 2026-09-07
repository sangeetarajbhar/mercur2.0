import {createWorkflow, transform, WorkflowResponse} from "@medusajs/framework/workflows-sdk";
import {CreateStockLocationDocumentDTO} from "../../../modules/stock-location-document/types/mutations";
import {
  createStockLocationDocumentStep
} from "../steps/create-stock-location-document";
import {STOCK_LOCATION_SECTION_MODULE} from "../../../modules/stock-location-section";
import {STOCK_LOCATION_DOCUMENT_MODULE} from "../../../modules/stock-location-document";
import {createRemoteLinkStep} from "@medusajs/medusa/core-flows";

export const assignStockLocationSectionToStockLocationDocument = createWorkflow(
  'assign-stock-location-section-to-stock-location-document',
  function (input: CreateStockLocationDocumentDTO) {
    const stockLocationDocument = createStockLocationDocumentStep(input)

    const link = transform({ stockLocationDocument, input}, ({ stockLocationDocument, input }) => {
      return [
        {
          [STOCK_LOCATION_SECTION_MODULE]: {
            stock_location_section_id: input.stock_location_section_id
          },
          [STOCK_LOCATION_DOCUMENT_MODULE]: {
            stock_location_document_id: stockLocationDocument.id
          }
        }
      ]
    })

    createRemoteLinkStep(link)
    return new WorkflowResponse(stockLocationDocument)
  }
)
