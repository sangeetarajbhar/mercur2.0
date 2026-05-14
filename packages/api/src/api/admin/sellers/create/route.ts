import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createSellerOnboardingWorkflow } from "../../../../workflows/seller/workflows/create-admin-seller-onboard"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { generatePassword, extractUrlPath } from "../utils"

type CreateSellerOnboardingInput = {
    // Define the input type based on your JSON structure
    name: string
    display_name?: string
    barcode?: string
    entity_type?: "PRIVATE_LIMITED" | "PROPRIETORSHIP" | "PARTNERSHIP" | null
    msme?: boolean
    seller_type?: "BRAND" | "SELLER" | "DISTRIBUTOR" | null
    description?: string
    email?: string
    phone?: string
    address_line?: string
    city?: string
    state?: string
    postal_code?: string
    country_code?: string
    /** Optional; defaults to `inr` when omitted (see createSellerOnboardingSchema). */
    currency_code?: string
    tax_id?: string
    member: any
    company_spocs: any[]
    kyc_documents: any[]
    brand_associations: any[]
    bank_detail: any,
    auth_identity_id: string
  }

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateSellerOnboardingInput>,
  res: MedusaResponse
) => {
    const authService = req.scope.resolve(Modules.AUTH)

    // Register auth identity - if it fails with duplicate email, the error message will be clear
    const { success, authIdentity, error } = await authService.register('emailpass', {
        body: {
          email: req.validatedBody.member.email,
          password: generatePassword(req.validatedBody.member?.name, req.validatedBody.member?.phone)
        }
      })
      
      if (!success || !authIdentity?.id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          error || "Failed to register auth identity."
        )
      }
    //   const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)



    const { result } = await createSellerOnboardingWorkflow(req.scope).run({
        input: {
          ...req.validatedBody,
          member: {
            ...req.validatedBody.member,
            photo: extractUrlPath(req.validatedBody.member?.photo) || null,
          },
          kyc_documents: req.validatedBody.kyc_documents?.map((doc) => ({
            kyc_type: doc.kyc_type,
            value: doc.value,
            file_url: extractUrlPath(doc.file_url),
          })) || [],
          brand_associations: req.validatedBody.brand_associations?.filter(ba => ba && ba.brand_id) || [],
          bank_detail: req.validatedBody.bank_detail ? {
            ...req.validatedBody.bank_detail,
            account_verified: req.validatedBody.bank_detail.account_verified === 'true' || req.validatedBody.bank_detail.account_verified === true
          } : undefined,
          auth_identity_id: authIdentity.id,
        },
      })
    
      res.json({ 
        seller: result.seller,
        companySpocs: result.companySpocs,
        kycDocuments: result.kycDocuments,
        bankDetail: result.bankDetail
      })
    
    
//   const { result } = await createSellerOnboardingWorkflow(req.scope).run({
//     input: {
//         ...req.validatedBody,
//         auth_identity_id: authIdentity.id,
//     },
//   })
//   res.json({ seller: result })
}