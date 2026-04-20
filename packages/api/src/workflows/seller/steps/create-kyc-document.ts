import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MercurModules } from "@mercurjs/types"

type CreateKycDocumentsInput = {
  sellerId: string
  kyc_documents: any[]
}

export const createKycDocumentsStep = createStep(
  "create-kyc-documents",
  async (input: CreateKycDocumentsInput, { container }) => {
    const sellerModuleService = container.resolve(MercurModules.SELLER)
    
    // Handle empty or undefined kyc_documents
    const documentsToProcess = input.kyc_documents || []
    
    if (documentsToProcess.length === 0) {
      return new StepResponse([], [])
    }

    // Fetch existing KYC documents to check for duplicate types
    const existingDocs = await sellerModuleService.listKycDocuments({ seller_id: input.sellerId })
    const existingKycTypes = new Set(existingDocs.map(doc => doc.kyc_type).filter(Boolean))
    const createKycTypes = new Set<string>()

    // Validate and prepare KYC documents for creation
    const docsToCreate = documentsToProcess
      .filter(doc => {
        if (!doc || !doc.kyc_type || !doc.value) {
          return false
        }
        
        // Check for duplicate kyc_type
        // Check if this kyc_type already exists in database
        if (existingKycTypes.has(doc.kyc_type)) {
          throw new MedusaError(
            MedusaError.Types.DUPLICATE_ERROR,
            `KYC document with type "${doc.kyc_type}" already exists for this seller. Cannot create duplicate.`
          )
        }
        
        // Check if this kyc_type is being created multiple times in the same request
        if (createKycTypes.has(doc.kyc_type)) {
          throw new MedusaError(
            MedusaError.Types.DUPLICATE_ERROR,
            `Multiple KYC documents with type "${doc.kyc_type}" cannot be created in the same request.`
          )
        }
        
        createKycTypes.add(doc.kyc_type)
        
        return true
      })
      .map(doc => ({
        ...doc,
        seller_id: input.sellerId
      }))
    
    const createdDocs = docsToCreate.length > 0 
      ? await sellerModuleService.createKycDocuments(docsToCreate)
      : []

    return new StepResponse(createdDocs, createdDocs.map(doc => doc.id))
  },
  async (docIds: string[], { container }) => {
    if (!docIds || docIds.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'KYC document IDs are required for compensation'
      )
    }
    
    const sellerModuleService = container.resolve(MercurModules.SELLER)
    await sellerModuleService.softDeleteKycDocuments(docIds)
  }
)
