import {
  WorkflowResponse,
  createWorkflow
} from '@medusajs/framework/workflows-sdk'

import { updateAdminSellerStep } from '../steps'
import { updateSellerMemberStep } from '../steps'
import { updateSellerCompanySpocsStep } from '../steps'
import { updateSellerKycDocumentsStep } from '../steps'
import { updateSellerBrandAssociationsStep } from '../steps'
import { updateSellerBankDetailStep } from '../steps'

type UpdateSellerWorkflowInput = {
  sellerId: string
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
  brand_associations?: {
    update?: { brand_id: string }[]  // Brands to add/map
    delete?: string[]                  // Brand IDs to unmap/remove
  }
  bank_detail: any
}

export const updateAdminSellerWorkflow = createWorkflow<
  UpdateSellerWorkflowInput,
  any,
  []
>('update-seller-workflow', (input) => {
  const {
    sellerId,
    name,
    display_name,
    barcode,
    entity_type,
    msme,
    seller_type,
    description,
    email,
    phone,
    address_line,
    city,
    state,
    postal_code,
    country_code,
    tax_id
    // exclude member, company_spocs, kyc_documents, brand_associations, bank_detail
  } = input

  const seller = updateAdminSellerStep({
    id: sellerId,
    name,
    display_name,
    barcode,
    entity_type,
    msme,
    seller_type,
    description,
    email,
    phone,
    address_line,
    city,
    state,
    postal_code,
    country_code,
    tax_id
  })

  // 2. Update the seller's member (assuming one main member)
  const member = updateSellerMemberStep({
    member: input.member,
    sellerId: input.sellerId
  })

  // 3. Update company SPOCs (batch processing: create/update based on ID)
  const companySpocsResult = updateSellerCompanySpocsStep({
    company_spocs: input.company_spocs || [],
    sellerId: input.sellerId
  })

  // 4. Update KYC documents (batch processing: create/update based on ID)
  const kycDocumentsResult = updateSellerKycDocumentsStep({
    kyc_documents: input.kyc_documents || [],
    sellerId: input.sellerId
  })

  // 5. Update brand associations (with separate update and delete arrays)
  const brandAssociations = updateSellerBrandAssociationsStep({
    brand_associations: input.brand_associations || { update: [], delete: [] },
    sellerId: input.sellerId
  })

  // 6. Update bank detail (hasOne)
  const bankDetail = updateSellerBankDetailStep({
    bank_detail: input.bank_detail,
    sellerId: input.sellerId
  })

  // Return all updated entities
  return new WorkflowResponse({
    seller,
    member,
    companySpocs: companySpocsResult,
    kycDocuments: kycDocumentsResult,
    brandAssociations,
    bankDetail
  })
})
