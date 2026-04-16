import { MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { SELLER_MODULE } from '../../../modules/seller'
import { SellerModuleService } from '../../../modules/seller'

type UpdateCompanySpocsInput = {
  company_spocs: any[]
  sellerId: string
}

export const updateSellerCompanySpocsStep = createStep<
  UpdateCompanySpocsInput,
  { created: any[], updated: any[] },
  { createdIds: string[], updatedIds: string[] }
>(
  "update-seller-company-spocs",
  async ({ company_spocs, sellerId }, { container }) => {
    const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)
    
    // Handle empty or undefined company_spocs
    const spocsToProcess = company_spocs || []
    
    if (spocsToProcess.length === 0) {
      return new StepResponse({ created: [], updated: [] }, { createdIds: [], updatedIds: [] })
    }

    // Fetch existing SPOCs to check for duplicate types
    const existingSpocs = await sellerModuleService.listCompanySpocs({ seller_id: sellerId })
    const existingTypes = new Set(existingSpocs.map(spoc => spoc.type).filter(Boolean))

    // Prepare lists for batch processing
    const toCreate: any[] = []
    const toUpdate: any[] = []
    const createTypes = new Set<string>()

    // Separate create and update based on ID presence
    for (const spoc of spocsToProcess) {
      if (!spoc) {
        continue // Skip invalid entries
      }

      if (spoc.id) {
        // ID provided - update existing record
        toUpdate.push({
          id: spoc.id,
          ...spoc,
          seller_id: sellerId
        })
      } else {
        // No ID - create new record
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
        
        toCreate.push({
          ...spoc,
          seller_id: sellerId
        })
      }
    }

    // Perform batch operations
    const created: any[] = toCreate.length > 0 
      ? await sellerModuleService.createCompanySpocs(toCreate)
      : []
    
    const updated: any[] = toUpdate.length > 0
      ? await sellerModuleService.updateCompanySpocs(toUpdate)
      : []

    return new StepResponse(
      { created, updated },
      { 
        createdIds: created.map(spoc => spoc.id),
        updatedIds: updated.map(spoc => spoc.id)
      }
    )
  },
  async (compensationData: { createdIds: string[], updatedIds: string[] }, { container }) => {
    if (!compensationData) return
    
    const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)
    
    // Rollback: delete created items
    if (compensationData.createdIds && compensationData.createdIds.length > 0) {
      await sellerModuleService.softDeleteCompanySpocs(compensationData.createdIds)
    }
    
    // Note: Updates are not rolled back as we don't store previous state
    // If needed, we could enhance this to store previous state
  }
)
