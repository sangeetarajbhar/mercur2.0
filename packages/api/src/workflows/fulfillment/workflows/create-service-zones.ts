import { FulfillmentWorkflow, ServiceZoneDTO } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  StepResponse,
  WorkflowData,
  WorkflowResponse,
  createStep,
  createWorkflow,
  transform,
  when
} from "@medusajs/framework/workflows-sdk"
import { createServiceZonesStep, createShippingOptionsWorkflow, CreateShippingOptionsWorkflowInput } from "@medusajs/medusa/core-flows"
// import { createServiceZonesStep } from "../steps"
import { FIXED_SHIPPING_OPTION_NAME, FIXED_SHIPPING_OPTION_TYPE, FIXED_SHIPPING_OPTION_PRICE, FIXED_SHIPPING_OPTION_CURRENCY, FIXED_SHIPPING_OPTION_PRICE_TYPE } from "../../../config/fixed-shpping-option"
import { MercurModules } from "@mercurjs/types"
const SELLER_MODULE = MercurModules.SELLER

/**
 * The service zones to create.
 */
export type CreateServiceZonesWorkflowOutput = ServiceZoneDTO[]

export const createServiceZonesWorkflowId = "create-custom-service-zones-workflow"
/**
 * This workflow creates one or more service zones. It's used by the
 * [Add Service Zone to Fulfillment Set Admin API Route](https://docs.medusajs.com/api/admin#fulfillment-sets_postfulfillmentsetsidservicezones).
 * 
 * You can use this workflow within your own customizations or custom workflows, allowing you to
 * create service zones within your custom flows.
 * 
 * @example
 * const { result } = await createServiceZonesWorkflow(container)
 * .run({
 *   input: {
 *     data: [
 *       {
 *         name: "US",
 *         fulfillment_set_id: "fuset_123",
 *         geo_zones: [
 *           {
 *             type: "country",
 *             country_code: "us",
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * })
 * 
 * @summary
 * 
 * Create one or more service zones.
 */

// const logStep = createStep(
//   "log-step",
//   async ({batchCreate}:any, { container }) => {
//     // const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
//     // logger.info("Logging from within a workflow step!")
//     console.log("ngjnjjkrnwkjngjkrngrwkjgnrjgwbatchCreatebatchCreate")
//     console.dir(batchCreate,{depth:null})
//     // console.log("ngjnjjkrnwkjngjkrngrwkjgnrjgwbatchUpdate")
//     // console.dir(batchUpdate,{depth:null})

//     return new StepResponse("Logged successfully")
//   }
// )

// {
//   id: 'serzo_01K4M890RYFERZGQN4QNCPHNK9',
//   name: 'test-ankit',
//   fulfillment_set_id: 'fuset_01K4CNQX5T8C352JH4S3SX47P4',
//   metadata: null,
//   created_at: '2025-09-08T08:49:57.022Z',
//   updated_at: '2025-09-08T08:49:57.022Z',
//   deleted_at: null,
//   geo_zones: [
//     {
//       id: 'fgz_01K4M890RYYPSH16QNBTC8D7HR',
//       type: 'country',
//       country_code: 'in',
//       province_code: null,
//       city: null,
//       postal_expression: null,
//       service_zone_id: 'serzo_01K4M890RYFERZGQN4QNCPHNK9',
//       metadata: null,
//       created_at: '2025-09-08T08:49:57.022Z',
//       updated_at: '2025-09-08T08:49:57.022Z',
//       deleted_at: null
//     }
//   ],
//   shipping_options: []
// }

// Step to fetch the first (oldest) shipping profile - ensures all sellers use the same profile
const fetchShippingProfilesStep = createStep(
  "fetch-shipping-profiles",
  async (input: any, { container }) => {
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)
    
    try {
      const shippingProfiles = await fulfillmentService.listShippingProfiles({
        type: "default"
      }, {
        take: 1,  // Only need the first one
        skip: 0,
        order: { created_at: "ASC" }  // Order by oldest first to always get the same profile
      })
      
      // console.log("Using first shipping profile:", shippingProfiles?.[0]?.id)
      return new StepResponse(shippingProfiles || [])
    } catch (error) {
      // console.warn("Could not fetch shipping profiles:", error.message)
      return new StepResponse([])
    }
  }
)

// Step to fetch available fulfillment providers
const fetchFulfillmentProvidersStep = createStep(
  "fetch-fulfillment-providers",
  async (input: any, { container }) => {
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)
    
    try {
      const providers = await fulfillmentService.listFulfillmentProviders({}, {
        take: 10, // Get first 10 providers
        skip: 0
      })
      
      // console.log("🔍 Found fulfillment providers:", providers?.length || 0)
      return new StepResponse(providers || [])
    } catch (error) {
      // console.warn(" Could not fetch fulfillment providers:", error.message)
      // Return empty array as fallback - will use manual_manual in transform
      return new StepResponse([])
    }
  }
)

// Step to get default shipping option types
const getDefaultShippingTypesStep = createStep(
  "get-default-shipping-types",
  async (input: any, { container }) => {
    // Define common shipping option types
    const defaultTypes = FIXED_SHIPPING_OPTION_TYPE
    
    
    // console.log(" Using default shipping types:", defaultTypes.length)
    return new StepResponse(defaultTypes)
  }
)

// Step to find or create shipping option type
const findOrCreateShippingOptionTypeStep = createStep(
  "find-or-create-shipping-option-type",
  async (input: any, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)
    
    const code = "standard-free-shipping"
    
    try {
      // Search for existing shipping option type with the code
      const { data: existingTypes } = await query.graph({
        entity: "shipping_option_type",
        fields: ["id", "code", "label", "description"],
        filters: {
          code: code
        }
      })
      
      // If found, return the first instance
      if (existingTypes && existingTypes.length > 0) {
        return new StepResponse(existingTypes[0] as any)
      }
    } catch (error) {
      // If query fails, continue to create new type
      console.log("Could not query shipping option types, will create new one")
    }
    
    // If not found, create a new shipping option type
    try {
      const newShippingOptionType = await fulfillmentService.createShippingOptionTypes([
        {
          code: code,
          label: "Default Shipping",
          description: "default delivery service"
        }
      ])
      
      return new StepResponse(newShippingOptionType[0])
    } catch (error: any) {
      // If creation fails, throw error
      throw new Error(`Failed to create shipping option type: ${error.message}`)
    }
  }
)

// Step to link seller with service zones and shipping options
const linkSellerWithServiceZonesAndShippingOptionsStep = createStep(
  "link-seller-with-service-zones-and-shipping-options",
  async ({ seller_id, createdServiceZones, shippingOptions }: any, { container }) => {
    if (!seller_id) {
      return new StepResponse({ 
        serviceZoneLinked: false,
        shippingOptionLinked: false
      })
    }
    
    const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
    
    const serviceZone = createdServiceZones?.[0]
    const shippingOption = shippingOptions?.[0]
    
    
    let serviceZoneLinked = false
    let shippingOptionLinked = false
    
    // Link seller with service zone
    if (serviceZone?.id) {
      try {
        await remoteLink.create({
          [SELLER_MODULE]: {
            seller_id: seller_id
          },
          [Modules.FULFILLMENT]: {
            service_zone_id: serviceZone.id
          }
        })
        serviceZoneLinked = true
      } catch (error: any) {
        // If link already exists, that's fine - skip it
        if (error.message?.includes('Cannot create multiple links')) {
          console.log('Service zone link already exists, skipping creation')
          serviceZoneLinked = true
        } else {
          throw error
        }
      }
    }
    
    // Link seller with shipping option
    if (shippingOption?.id) {
      try {
        await remoteLink.create({
          [Modules.FULFILLMENT]: {
            shipping_option_id: shippingOption.id
          },
          [SELLER_MODULE]: {
            seller_id: seller_id
          }
          
        })
        shippingOptionLinked = true
      } catch (error: any) {
        // If link already exists, that's fine - skip it
        if (error.message?.includes('Cannot create multiple links')) {
          shippingOptionLinked = true
        } else {
          throw error
        }
      }
    }
    
    return new StepResponse({ 
      serviceZoneLinked,
      shippingOptionLinked
    })
  }
)

export const createServiceZonesWorkflow = createWorkflow(
  createServiceZonesWorkflowId,
  (
    input: WorkflowData<any>
  ): WorkflowResponse<CreateServiceZonesWorkflowOutput> => {

    // Check if Service Zone is already created (ie. input contains id)
    // If it exists, skip creation and return existing
    // If not, create new service zone(s)
    let createdServiceZones = when("create-service-zones-condition",input, (input) => !input.data[0]?.id)
    .then(() => createServiceZonesStep(input.data)) as any
    
    createdServiceZones =  when("return-input-data-condition",input, (input) => input.data[0].id)
    .then(() => input.data)


    // Fetch available shipping configurations dynamically
    const shippingProfiles = fetchShippingProfilesStep({})
    const fulfillmentProviders = fetchFulfillmentProvidersStep({})
    const shippingTypes = getDefaultShippingTypesStep({})

    const shippingOptionType = findOrCreateShippingOptionTypeStep({})

    const shippingOptionsInput = transform(
      { createdServiceZones, shippingProfiles, fulfillmentProviders, shippingTypes, shippingOptionType },
      ({ createdServiceZones, shippingProfiles, fulfillmentProviders, shippingTypes, shippingOptionType }) => {
        const firstServiceZone = createdServiceZones[0]
        if (!firstServiceZone) {
          return []
        }

        // Get first available shipping profile, provider, and type from the lists
        const firstShippingProfile = shippingProfiles?.[0]
        const firstProvider = fulfillmentProviders?.[0] 
        const firstType = shippingTypes?.[0]

        // Log what we're using for debugging
        // console.log(" Creating shipping option with:")
        // console.log("  - Shipping Profile:", firstShippingProfile?.id || "none found")
        // console.log("  - Provider:", firstProvider?.id || "none found") 
        // console.log("  - Type:", firstType?.code || "none found")

        // const shippingOptionType = findOrCreateShippingOptionTypeStep({})

        return [
          {
            name: FIXED_SHIPPING_OPTION_NAME,
            service_zone_id: firstServiceZone.id,
            shipping_profile_id: firstShippingProfile?.id || "sp_fallback", // Use first profile or fallback
            provider_id: firstProvider?.id || "manual_manual",              // Use first provider or fallback
            // type: {
            //   label: firstType?.label || "Standard Shipping",
            //   description: firstType?.description || "Standard delivery service",
            //   code: firstType?.code || "standard",
            // },
            type_id: shippingOptionType?.id,
            price_type: FIXED_SHIPPING_OPTION_PRICE_TYPE,
            prices: [
              {
                amount: FIXED_SHIPPING_OPTION_PRICE,     
                currency_code: FIXED_SHIPPING_OPTION_CURRENCY,
              },
            ],
          },
        ]
      }
    )

    const shippingOptions = createShippingOptionsWorkflow.runAsStep({
      input: shippingOptionsInput as CreateShippingOptionsWorkflowInput,
    })

    // Link seller with service zones and shipping options
    linkSellerWithServiceZonesAndShippingOptionsStep({
      seller_id: input.seller_id,
      createdServiceZones,
      shippingOptions
    })

    // logStep({batchCreate: createdServiceZones})
    return new WorkflowResponse(createdServiceZones)
  }
)
