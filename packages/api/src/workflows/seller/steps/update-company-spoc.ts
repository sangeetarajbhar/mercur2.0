import { MedusaError } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
const SELLER_MODULE = "seller"
type SellerModuleService = any

type UpdateCompanySpocsInput = {
  company_spocs: any[]
  sellerId: string
}

export const updateSellerCompanySpocsStep = createStep<
  UpdateCompanySpocsInput,
  { created: any[]; updated: any[] },
  { createdIds: string[]; updatedIds: string[] }
>("update-seller-company-spocs", async ({ company_spocs, sellerId }, { container }) => {
  const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)

  const spocsToProcess = company_spocs || []
  if (spocsToProcess.length === 0) {
    return new StepResponse({ created: [], updated: [] }, { createdIds: [], updatedIds: [] })
  }

  const existingSpocs = await (sellerModuleService as any).listCompanySpocs({ seller_id: sellerId })
  const existingTypes = new Set(existingSpocs.map((spoc: any) => spoc.type).filter(Boolean))

  const toCreate: any[] = []
  const toUpdate: any[] = []
  const createTypes = new Set<string>()

  for (const spoc of spocsToProcess) {
    if (!spoc) continue

    if (spoc.id) {
      toUpdate.push({ id: spoc.id, ...spoc, seller_id: sellerId })
    } else {
      if (spoc.type) {
        if (existingTypes.has(spoc.type)) {
          throw new MedusaError(
            MedusaError.Types.DUPLICATE_ERROR,
            `Company SPOC with type "${spoc.type}" already exists for this seller. Cannot create duplicate.`
          )
        }
        if (createTypes.has(spoc.type)) {
          throw new MedusaError(
            MedusaError.Types.DUPLICATE_ERROR,
            `Multiple Company SPOCs with type "${spoc.type}" cannot be created in the same request.`
          )
        }
        createTypes.add(spoc.type)
      }

      toCreate.push({ ...spoc, seller_id: sellerId })
    }
  }

  const created: any[] = toCreate.length > 0 ? await (sellerModuleService as any).createCompanySpocs(toCreate) : []
  const updated: any[] = toUpdate.length > 0 ? await (sellerModuleService as any).updateCompanySpocs(toUpdate) : []

  return new StepResponse(
    { created, updated },
    { createdIds: created.map((s: any) => s.id), updatedIds: updated.map((s: any) => s.id) }
  )
}, async (compensationData: { createdIds: string[]; updatedIds: string[] }, { container }) => {
  if (!compensationData) return
  const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)
  if (compensationData.createdIds && compensationData.createdIds.length > 0) {
    await (sellerModuleService as any).softDeleteCompanySpocs(compensationData.createdIds)
  }
})

