import { MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { SELLER_MODULE, SellerModuleService } from '../../../modules/seller'

type UpdateKycDocumentsInput = {
  kyc_documents: any[]
  sellerId: string
}

type KycType =
  | "PAN"
  | "TAN"
  | "NOODLE_LETTER"
  | "SIGNATURE"
  | "COI"
  | "INVOICE_GUIDELINE"
  | "CANCELLED_CHEQUE"
  | "AGREEMENT"
  | "TRADEMARK"
  | "SIN_NUMBER"
  | "GST_CERTIFICATE"
  | "MSME_CERTIFICATE"
  | "OTHERS"



export const updateSellerKycDocumentsStep = createStep<
  UpdateKycDocumentsInput,
  { created: any[], updated: any[] },
  { createdIds: string[], updatedIds: string[] }
>(
  "update-seller-kyc-documents",
  async ({ kyc_documents, sellerId }, { container }) => {
    const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)
    
    // Handle empty or undefined kyc_documents
    const documentsToProcess = kyc_documents || []
    
    if (documentsToProcess.length === 0) {
      return new StepResponse({ created: [], updated: [] }, { createdIds: [], updatedIds: [] })
    }

    // Fetch existing KYC documents to check for duplicate types
    const existingDocs = await sellerModuleService.listKycDocuments({ seller_id: sellerId })
    const existingKycTypes = new Set(existingDocs.map(doc => doc.kyc_type).filter(Boolean))

    // Prepare lists for batch processing
    const toCreate: any[] = []
    const toUpdate: any[] = []
    const createKycTypes = new Set<string>()

    // Separate create and update based on ID presence
    for (const doc of documentsToProcess) {
      if (!doc || !doc.kyc_type || !doc.value) {
        continue // Skip invalid entries
      }

      if (doc.id) {
        // ID provided - update existing record
        toUpdate.push({
          id: doc.id,
          ...doc,
          seller_id: sellerId
        })
      } else {
        // No ID - create new record
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
        
        toCreate.push({
          ...doc,
          seller_id: sellerId
        })
      }
    }

    // Perform batch operations
    const created: any[] = toCreate.length > 0 
      ? await sellerModuleService.createKycDocuments(toCreate)
      : []
    
    const updated: any[] = toUpdate.length > 0
      ? await sellerModuleService.updateKycDocuments(toUpdate)
      : []

    return new StepResponse(
      { created, updated },
      { 
        createdIds: created.map(doc => doc.id),
        updatedIds: updated.map(doc => doc.id)
      }
    )
  },
  async (compensationData: { createdIds: string[], updatedIds: string[] }, { container }) => {
    if (!compensationData) return
    
    const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)
    
    // Rollback: delete created items
    if (compensationData.createdIds && compensationData.createdIds.length > 0) {
      await sellerModuleService.softDeleteKycDocuments(compensationData.createdIds)
    }
    
    // Note: Updates are not rolled back as we don't store previous state
    // If needed, we could enhance this to store previous state
  }
)