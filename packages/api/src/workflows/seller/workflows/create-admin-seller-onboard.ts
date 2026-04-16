import {
  WorkflowResponse,
  createWorkflow,
//   parallelize
} from '@medusajs/framework/workflows-sdk'
import { setAuthAppMetadataStep } from '@medusajs/medusa/core-flows'

import {
  createAdminSellerStep,
  createSellerOnboardingStep,
  createCompanySpocsStep,
  createKycDocumentsStep,
  createBankDetailStep
} from '../steps'

type CreateSellerOnboardingInput = {
  // Define the input type based on your JSON structure
    name: string
    display_name?: string
    barcode?: string
    entity_type?: 'PRIVATE_LIMITED' | 'PROPRIETORSHIP' | 'PARTNERSHIP' | null
    msme?: boolean
    seller_type?: 'BRAND' | 'SELLER' | 'DISTRIBUTOR' | null
    description?: string
    email?: string
    phone?: string
    address_line?: string
    city?: string
    state?: string
    postal_code?: string
    country_code?: string
    tax_id?: string
    member: any
    company_spocs: any[]
    kyc_documents: any[]
    brand_associations: any[]
    bank_detail: any
    auth_identity_id: string
}

export const createSellerOnboardingWorkflow = createWorkflow<
  CreateSellerOnboardingInput,
  any,
  any[]
>('create-seller-onboarding', (input) => {
  const seller = createAdminSellerStep(input)
  createSellerOnboardingStep(seller)
  
  // Create company SPOCs
  const companySpocs = createCompanySpocsStep({
    company_spocs: input.company_spocs,
    sellerId: seller.id
  })


  // Create KYC documents
  const kycDocuments = createKycDocumentsStep({
    kyc_documents: input.kyc_documents,
    sellerId: seller.id
  })
  
  // Create bank detail
  const bankDetail = createBankDetailStep({
    bank_detail: input.bank_detail,
    sellerId: seller.id
  })
  
  setAuthAppMetadataStep({
        authIdentityId: input.auth_identity_id,
        actorType: 'seller',
        value: seller.members[0].id
      })

  return new WorkflowResponse({
    seller,
    companySpocs,
    kycDocuments,
    bankDetail
  })
})
