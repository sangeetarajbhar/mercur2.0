import { createWorkflow, WorkflowResponse, createStep, StepResponse, transform } from "@medusajs/framework/workflows-sdk"
import { Modules, ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"




interface AddReturnInterface {
    locationId: string
    returnId: string
}

export const getReturnLocationDetails = createStep(
    "get-return-location-details",
    async (input: AddReturnInterface, { container }): Promise<any> => {
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        if(!input?.locationId && !input?.returnId) return new StepResponse({})
        const { data: [stockLocations] } = await query.graph({
            entity: "stock_location",
            fields: [
                "stock_location_extension.return_location_id",
            ],
            filters: {
                id: input.locationId
            }
        })
        if (stockLocations && stockLocations.stock_location_extension && stockLocations.stock_location_extension.return_location_id) {
            const { data: [returnLocation] } = await query.graph({
                entity: "stock_location",
                fields: [
                    "address.*",
                    "stock_location_section.stock_location_contact.*"
                ],
                filters: {
                    id: stockLocations.stock_location_extension.return_location_id
                }
            });
            if (returnLocation && returnLocation.stock_location_section) {
                return new StepResponse({error: false, data:returnLocation, ...input })
             }
        }
        // throw new MedusaError(
        //   MedusaError.Types.NOT_FOUND,
        //   "Failed to fetch stock location"
        // )
    }
)

const addReturnAddressStep = createStep(
    "add-return-address",
    async (input: any, { container }): Promise<any> => {
        const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
        const { returnId, data } = input
        

        //Using knex to get the fulfillment_address id which is connected with the return fulfillment
        const result = await knex('return as r')
            .join('return_fulfillment as rf', 'r.id', 'rf.return_id')
            .join('fulfillment as f', 'rf.fulfillment_id', 'f.id')
            .join('fulfillment_address as fa', 'f.delivery_address_id', 'fa.id')
            .select('fa.id')
            .where('r.id', returnId)
            .first();
        
            
        let contacts = data?.stock_location_section?.stock_location_contact    
        let address = data?.address

        // Updating the fulfillment_address
        const updatedAddress = await knex('fulfillment_address')
        .where({ id: result.id })
        .update({
          first_name: contacts.first_name,
          last_name: contacts.last_name,
          address_1: address.address_1,
          address_2: address.address_2,
          company: address.company,
          city: address.city,
          country_code: address.country_code,
          province: address.province,
          postal_code: address.postal_code,
          phone: address.phone,
          updated_at: knex.fn.now()
        });
    }
)

export const addReturnAddressWorkflow = createWorkflow(
    "add-return-address-workflow",
    (input: AddReturnInterface) => {
        const locationDetails =  getReturnLocationDetails(input)
        addReturnAddressStep(locationDetails)
        return new WorkflowResponse({ locationDetails })
    }
)