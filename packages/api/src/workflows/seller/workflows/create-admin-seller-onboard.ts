import {
    WorkflowResponse,
    createWorkflow,
    transform,
} from '@medusajs/framework/workflows-sdk'
import { setAuthAppMetadataStep } from '@medusajs/medusa/core-flows'

import {
    createAdminSellerStep,
    createCompanySpocsStep,
    createKycDocumentsStep,
    createBankDetailStep
} from '../steps'
import type { CreateAdminSellerOnboardingInput } from '../../../types/seller'
import { updateSellerAddressWorkflow } from './update-seller-address'
import { updateSellerProfessionalDetailsWorkflow } from './update-seller-professional-details'

export type CreateSellerOnboardingInput = CreateAdminSellerOnboardingInput & {
    auth_identity_id: string
}

export const createSellerOnboardingWorkflow = createWorkflow<
    CreateSellerOnboardingInput,
    any,
    any[]
>('create-seller-onboarding', (input) => {
    const seller = createAdminSellerStep(input)

    updateSellerAddressWorkflow.runAsStep({
      input: transform({ seller, input }, ({ seller, input }) => ({
        seller_id: seller.id,
        data: {
          address_1: input.address_line ?? null,
          city: input.city ?? null,
          province: input.state ?? null,
          postal_code: input.postal_code ?? null,
          country_code: input.country_code ?? null,
          phone: input.phone ?? null,
        },
      })),
    })

    updateSellerProfessionalDetailsWorkflow.runAsStep({
      input: transform({ seller, input }, ({ seller, input }) => ({
        seller_id: seller.id,
        data: {
          tax_id: input.tax_id ?? null,
          corporate_name: (seller as any).display_name || (seller as any).name || input.name,
        },
      })),
    })

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
        actorType: 'member',
        value: seller.members[0].id
    })

    return new WorkflowResponse({
        seller,
        companySpocs,
        kycDocuments,
        bankDetail
    })
})
