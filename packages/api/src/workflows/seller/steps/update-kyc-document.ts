import { MedusaError } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
const SELLER_MODULE = "seller"
type SellerModuleService = any

type UpdateKycDocumentsInput = {
  kyc_documents: any[]
  sellerId: string
}

export const updateSellerKycDocumentsStep = createStep<
  UpdateKycDocumentsInput,
  { created: any[]; updated: any[] },
  { createdIds: string[]; updatedIds: string[] }
>("update-seller-kyc-documents", async ({ kyc_documents, sellerId }, { container }) => {
  const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)

  const documentsToProcess = kyc_documents || []
  if (documentsToProcess.length === 0) {
    return new StepResponse({ created: [], updated: [] }, { createdIds: [], updatedIds: [] })
  }

  const existingDocs = await (sellerModuleService as any).listKycDocuments({ seller_id: sellerId })
  const existingKycTypes = new Set(existingDocs.map((doc: any) => doc.kyc_type).filter(Boolean))

  const toCreate: any[] = []
  const toUpdate: any[] = []
  const createKycTypes = new Set<string>()

  for (const doc of documentsToProcess) {
    if (!doc || !doc.kyc_type || !doc.value) continue

    if (doc.id) {
      toUpdate.push({ id: doc.id, ...doc, seller_id: sellerId })
    } else {
      if (existingKycTypes.has(doc.kyc_type)) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          `KYC document with type "${doc.kyc_type}" already exists for this seller. Cannot create duplicate.`
        )
      }
      if (createKycTypes.has(doc.kyc_type)) {
        throw new MedusaError(
          MedusaError.Types.DUPLICATE_ERROR,
          `Multiple KYC documents with type "${doc.kyc_type}" cannot be created in the same request.`
        )
      }
      createKycTypes.add(doc.kyc_type)
      toCreate.push({ ...doc, seller_id: sellerId })
    }
  }

  const created: any[] = toCreate.length > 0 ? await (sellerModuleService as any).createKycDocuments(toCreate) : []
  const updated: any[] = toUpdate.length > 0 ? await (sellerModuleService as any).updateKycDocuments(toUpdate) : []

  return new StepResponse(
    { created, updated },
    { createdIds: created.map((d: any) => d.id), updatedIds: updated.map((d: any) => d.id) }
  )
}, async (compensationData: { createdIds: string[]; updatedIds: string[] }, { container }) => {
  if (!compensationData) return
  const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)
  if (compensationData.createdIds && compensationData.createdIds.length > 0) {
    await (sellerModuleService as any).softDeleteKycDocuments(compensationData.createdIds)
  }
})

