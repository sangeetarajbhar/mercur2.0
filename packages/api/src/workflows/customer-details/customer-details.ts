import { createWorkflow, WorkflowResponse, createStep, StepResponse  } from "@medusajs/framework/workflows-sdk"
import CustomerDetailModuleService from "../../modules/customer/service"
import {CUSTOMER_DETAILS_MODULE} from '../../modules/customer/index'
import CUSTOMER_DETAILS_LINK from '../../links/customer-customer-details'
import { Modules } from "@medusajs/framework/utils"

interface AddCustomerDetailsInput {
    customerId: string,
    dob: string | null | "",
    gender: 'M' | 'F' | null | "",
}

export const addCustomerDetailsStep = createStep(
  "add-customer-details-step",
  async (input:AddCustomerDetailsInput, {container}) => {
    const link = container.resolve("link")
    const query = container.resolve("query")
    const customerDetailModuleService: CustomerDetailModuleService = container.resolve(CUSTOMER_DETAILS_MODULE)

    if(!input.dob && !input.gender){
      return new StepResponse({})
    }

    //Check if customer detail already exists for the customer 
    const {data} = await query.graph({
      entity: CUSTOMER_DETAILS_LINK.entryPoint,
      fields: ["customer_details.*"],
      filters: {customer_id: input.customerId}
    })

    const prevCustDetails = data[0]?.customer_details

    //Update if exists
    if(data.length > 0){
      // Update existing customer details
      await customerDetailModuleService.updateCustomerDetails({
        id: data[0].customer_details.id,
        dob: input.dob ? new Date(input.dob) : prevCustDetails.dob,
        gender: input.gender ? input.gender : prevCustDetails.gender
      })
      return new StepResponse({})
    }

    const customerDetail = await customerDetailModuleService.createCustomerDetails({
      dob: input.dob ?  new Date(input.dob) : null,
      gender: input.gender ? input.gender : null,
    })

    //link customer detail with customer  
    await link.create({
        [Modules.CUSTOMER]: { customer_id: input.customerId },
        [CUSTOMER_DETAILS_MODULE]: { customer_details_id: customerDetail.id },
    })
    return new StepResponse({})
  }
)

export const addCustomerDetailsWorkflow = createWorkflow(
  "add-customer-details",
  (input:AddCustomerDetailsInput) => {
    // No steps yet
    addCustomerDetailsStep(input)
    return new WorkflowResponse({})
  }
)
