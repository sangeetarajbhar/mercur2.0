import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  StepResponse, 
  createStep,
  transform,
  parallelize
} from "@medusajs/framework/workflows-sdk"

import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {createServiceZonesWorkflow} from '../../fulfillment/workflows/create-service-zones'

interface Set {
    name: string,
    type: "shipping" | "pickup"
}

interface addDefaultZoneAndOptionsInput {
    seller_id: string;
    stock_location_id: string;
    location_name: string;
    set: Set
}

interface addDefaultZoneInput {
    stock_location_id: string,
    name: string,
    set: Set
}

const addDefaultZone = createStep(
  'add-default-zone',
  async (data: addDefaultZoneInput, { container }) => {

  const { stock_location_id, name, set } = data

  const link = container.resolve("link")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  
  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets(
    {
      name: `${name} ${set.name}`,
      type: set.type,
    }
  );
    
      await link.create({
           [Modules.STOCK_LOCATION]: { stock_location_id: stock_location_id } ,
           [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id }
      })
      
      const serviceZonesStep = await fulfillmentModuleService.createServiceZones({
        name: `${name} India ${set.name}`,
        fulfillment_set_id: fulfillmentSet.id
      })
        
        const geoZones = await fulfillmentModuleService.createGeoZones([
         {
           type: "country",
           service_zone_id: serviceZonesStep.id,
           country_code: "in",
         }
        ])
        return new StepResponse({serviceZones: serviceZonesStep})
  })

export const addDefaultZoneAndOptions = createWorkflow(
  'add-default-zone-and-options',
  (input: WorkflowData<addDefaultZoneAndOptionsInput>) => {
  const { stock_location_id, location_name, set, seller_id } = input
  let {serviceZones} = addDefaultZone({stock_location_id, name: location_name, set})

  const results = createServiceZonesWorkflow.runAsStep({input: {data: [serviceZones], seller_id: seller_id}})

  return new WorkflowResponse({serviceZones})
})

