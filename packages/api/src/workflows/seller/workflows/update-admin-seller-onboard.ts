import { WorkflowResponse, createWorkflow, transform } from "@medusajs/framework/workflows-sdk"

import {
  updateAdminSellerMemberStep,
  updateAdminSellerStep,
  updateSellerBankDetailStep,
  updateSellerBrandAssociationsStep,
  updateSellerCompanySpocsStep,
  updateSellerKycDocumentsStep,
} from "../steps"
import { updateSellerAddressWorkflow } from "./update-seller-address"
import { updateSellerProfessionalDetailsWorkflow } from "./update-seller-professional-details"

type UpdateSellerWorkflowInput = {
  sellerId: string
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
  tax_id?: string
  member: any
  company_spocs: any[]
  kyc_documents: any[]
  brand_associations?: {
    update?: { brand_id: string }[]
    delete?: string[]
  }
  bank_detail: any
}

export const updateAdminSellerWorkflow = createWorkflow<UpdateSellerWorkflowInput, any, []>(
  "update-seller-workflow",
  (input) => {
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
      tax_id,
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
      tax_id,
    })

    updateSellerAddressWorkflow.runAsStep({
      input: transform({ seller, input }, ({ seller, input }) => {
        const data: Record<string, string | null> = {}
        if (input.address_line !== undefined) {
          data.address_1 = input.address_line ?? null
        }
        if (input.city !== undefined) data.city = input.city ?? null
        if (input.state !== undefined) data.province = input.state ?? null
        if (input.postal_code !== undefined) data.postal_code = input.postal_code ?? null
        if (input.country_code !== undefined) data.country_code = input.country_code ?? null
        if (input.phone !== undefined) data.phone = input.phone ?? null
        /** `seller` from a prior workflow step may not hydrate `.id` in transforms — use route id. */
        const seller_id = (seller as any)?.id ?? input.sellerId
        return {
          seller_id,
          data,
        }
      }),
    })

    updateSellerProfessionalDetailsWorkflow.runAsStep({
      input: transform({ seller, input }, ({ seller, input }) => {
        const data: Record<string, string | null> = {}
        if (input.tax_id !== undefined) {
          data.tax_id = input.tax_id ?? null
        }
        if (input.display_name !== undefined || input.name !== undefined) {
          data.corporate_name = (input.display_name ?? input.name) ?? null
        }
        const seller_id = (seller as any)?.id ?? input.sellerId
        return {
          seller_id,
          data,
        }
      }),
    })

    const member = updateAdminSellerMemberStep({
      member: input.member,
      sellerId: input.sellerId,
    })

    const companySpocsResult = updateSellerCompanySpocsStep({
      company_spocs: input.company_spocs || [],
      sellerId: input.sellerId,
    })

    const kycDocumentsResult = updateSellerKycDocumentsStep({
      kyc_documents: input.kyc_documents || [],
      sellerId: input.sellerId,
    })

    const brandAssociations = updateSellerBrandAssociationsStep({
      brand_associations: input.brand_associations || { update: [], delete: [] },
      sellerId: input.sellerId,
    })

    const bankDetail = updateSellerBankDetailStep({
      bank_detail: input.bank_detail,
      sellerId: input.sellerId,
    })

    return new WorkflowResponse({
      seller,
      member,
      companySpocs: companySpocsResult,
      kycDocuments: kycDocumentsResult,
      brandAssociations,
      bankDetail,
    })
  }
)

