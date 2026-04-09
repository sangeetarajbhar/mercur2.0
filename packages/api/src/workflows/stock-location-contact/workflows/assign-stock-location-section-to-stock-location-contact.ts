import {createWorkflow, transform, WorkflowResponse} from "@medusajs/framework/workflows-sdk";
import {CreateStockLocationContactDTO} from "../../../modules/stock-location-contact/types/mutations";
import {createStockLocationContactStep} from "../steps/create-stock-location-contact";
import {STOCK_LOCATION_SECTION_MODULE} from "../../../modules/stock-location-section";
import {STOCK_LOCATION_CONTACT_MODULE} from "../../../modules/stock-location-contact";
import {createRemoteLinkStep} from "@medusajs/medusa/core-flows";

export const assignStockLocationSectionToStockLocationContact = createWorkflow(
  'assign-stock-location-section-to-stock-location-contact',
  function (input: CreateStockLocationContactDTO) {
    const stockLocationContact = createStockLocationContactStep(input)

    const link = transform({ stockLocationContact, input}, ({ stockLocationContact, input }) => {
      return [
        {
          [STOCK_LOCATION_SECTION_MODULE]: {
            stock_location_section_id: input.stock_location_section_id
          },
          [STOCK_LOCATION_CONTACT_MODULE]: {
            stock_location_contact_id: stockLocationContact.id
          }
        }
      ]
    })

    createRemoteLinkStep(link)
    return new WorkflowResponse(stockLocationContact)
  }
)
