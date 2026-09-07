import {createWorkflow, transform, WorkflowResponse} from "@medusajs/framework/workflows-sdk";
import {createStockLocationExtensionStep} from "../steps";
import {Modules} from "@medusajs/framework/utils";
import {STOCK_LOCATION_EXTENSION_MODULE} from "../../../modules/stock-location-extension";
import {createRemoteLinkStep} from "@medusajs/medusa/core-flows";
import {CreateStockLocationExtensionDTO} from "../../../modules/stock-location-extension/types/mutations";

interface WorkflowData extends CreateStockLocationExtensionDTO {
  stock_location_id: string
}

export const assignStockLocationToStockLocationExtension = createWorkflow(
  'assign-stock-location-to-stock-location-extension',
  function (input: WorkflowData) {
    const stockLocationExtension = createStockLocationExtensionStep(input)

    const link = transform({ stockLocationExtension, input }, ({ stockLocationExtension, input }) => {
      return [
        {
          [Modules.STOCK_LOCATION]: {
            stock_location_id: input.stock_location_id
          },
          [STOCK_LOCATION_EXTENSION_MODULE]: {
            stock_location_extension_id: stockLocationExtension.id
          }
        }
      ]
    })

    createRemoteLinkStep(link)
    return new WorkflowResponse(stockLocationExtension)
  }
)
