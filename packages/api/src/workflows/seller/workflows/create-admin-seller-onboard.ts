import {
    WorkflowResponse,
    createWorkflow,
    //   parallelize
} from '@medusajs/framework/workflows-sdk'
import { setAuthAppMetadataStep } from '@medusajs/medusa/core-flows'

import {
    createAdminSellerStep,
    createCompanySpocsStep,
    createKycDocumentsStep,
    createBankDetailStep
} from '../steps'
import type { CreateAdminSellerOnboardingInput } from '../../../types/seller'

export type CreateSellerOnboardingInput = CreateAdminSellerOnboardingInput & {
    auth_identity_id: string
}

export const createSellerOnboardingWorkflow = createWorkflow<
    CreateSellerOnboardingInput,
    any,
    any[]
>('create-seller-onboarding', (input) => {
    const seller = createAdminSellerStep(input)

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
