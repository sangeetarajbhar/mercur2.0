import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MercurModules } from "@mercurjs/types"

type CreateCompanySpocsInput = {
  sellerId: string
  company_spocs: any[]
}

export const createCompanySpocsStep = createStep(
  "create-company-spocs",
  async (input: CreateCompanySpocsInput, { container }) => {
    const sellerModuleService = container.resolve(MercurModules.SELLER)
    
    // Handle empty or undefined company_spocs
    const spocsToProcess = input.company_spocs || []
    
    if (spocsToProcess.length === 0) {
      return new StepResponse([], [])
    }

    // Fetch existing SPOCs to check for duplicate types
    const existingSpocs = await sellerModuleService.listCompanySpocs({ seller_id: input.sellerId })
    const existingTypes = new Set(existingSpocs.map(spoc => spoc.type).filter(Boolean))
    const createTypes = new Set<string>()

    // Validate and prepare SPOCs for creation
    const spocsToCreate = spocsToProcess
      .filter(spoc => {
        if (!spoc || !spoc.first_name || !spoc.last_name || !spoc.email || !spoc.phone) {
          return false
        }
        
        // Check for duplicate type
        if (spoc.type) {
          // Check if this type already exists in database
          if (existingTypes.has(spoc.type)) {
            throw new MedusaError(
              MedusaError.Types.DUPLICATE_ERROR,
              `Company SPOC with type "${spoc.type}" already exists for this seller. Cannot create duplicate.`
            )
          }
          
          // Check if this type is being created multiple times in the same request
          if (createTypes.has(spoc.type)) {
            throw new MedusaError(
              MedusaError.Types.DUPLICATE_ERROR,
              `Multiple Company SPOCs with type "${spoc.type}" cannot be created in the same request.`
            )
          }
          
          createTypes.add(spoc.type)
        }
        
        return true
      })
      .map(spoc => ({
        ...spoc,
        seller_id: input.sellerId
      }))
    
    const createdSpocs = spocsToCreate.length > 0 
      ? await sellerModuleService.createCompanySpocs(spocsToCreate)
      : []

    return new StepResponse(createdSpocs, createdSpocs.map(spoc => spoc.id))
  },
  async (spocIds: string[], { container }) => {
    if (!spocIds || spocIds.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Company SPOC IDs are required for compensation'
      )
    }
    
    const sellerModuleService = container.resolve(MercurModules.SELLER)
    await sellerModuleService.softDeleteCompanySpocs(spocIds)
  }
)
