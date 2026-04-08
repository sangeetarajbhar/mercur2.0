import {createWorkflow, transform, WorkflowResponse} from "@medusajs/framework/workflows-sdk";
import {CreateStockLocationSectionDTO} from "../../../modules/stock-location-section/types/mutations";
import {createStockLocationSectionStep} from "../steps";
import {Modules} from "@medusajs/framework/utils";
import {STOCK_LOCATION_SECTION_MODULE} from "../../../modules/stock-location-section";
import {createRemoteLinkStep} from "@medusajs/medusa/core-flows";

export const assignStockLocationToStockLocationSection = createWorkflow(
  'assign-stock-location-to-stock-location-section',
  function (input: CreateStockLocationSectionDTO) {
    const stockLocationSection = createStockLocationSectionStep(input)
    const link = transform({ stockLocationSection, input}, ({ stockLocationSection, input }) => {
      return [
        {
          [Modules.STOCK_LOCATION]: {
            stock_location_id: input.stock_location_id
          },
          [STOCK_LOCATION_SECTION_MODULE]: {
            stock_location_section_id: stockLocationSection.id
          }
        }
      ]
    })

    createRemoteLinkStep(link)
    return new WorkflowResponse(stockLocationSection)
  }
)
