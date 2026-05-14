import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { updateAdminSellerWorkflow } from "../../../../../workflows/seller/workflows/update-admin-seller-onboard"
import SellerBrandLink from "../../../../../links/seller-brand"
import { extractUrlPath } from "../../utils"

type UpdateSellerOnboardingInput = {
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

export const POST = async (
  req: AuthenticatedMedusaRequest<UpdateSellerOnboardingInput>,
  res: MedusaResponse
) => {
  const sellerId = req.params.id

  if (req.validatedBody.member?.email !== undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Email cannot be updated. Email is used for authentication and cannot be changed."
    )
  }

  const { email, ...memberWithoutEmail } = req.validatedBody.member || {}

  const { result } = await updateAdminSellerWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      sellerId,
      member: {
        ...memberWithoutEmail,
        photo: extractUrlPath(req.validatedBody.member?.photo) || null,
      },
      kyc_documents:
        req.validatedBody.kyc_documents?.map((doc: any) => ({
          id: doc.id,
          kyc_type: doc.kyc_type,
          value: doc.value,
          file_url: extractUrlPath(doc.file_url),
        })) || [],
      company_spocs:
        req.validatedBody.company_spocs?.map((spoc: any) => ({
          id: spoc.id,
          ...spoc,
        })) || [],
      brand_associations: req.validatedBody.brand_associations
        ? {
            update:
              req.validatedBody.brand_associations.update?.filter(
                (ba: any) => ba && ba.brand_id
              ) || [],
            delete:
              req.validatedBody.brand_associations.delete?.filter((id: any) => id) || [],
          }
        : undefined,
      bank_detail: req.validatedBody.bank_detail
        ? {
            ...req.validatedBody.bank_detail,
            account_verified:
              req.validatedBody.bank_detail.account_verified === "true" ||
              req.validatedBody.bank_detail.account_verified === true,
          }
        : undefined,
    },
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: brandLinks } = await query.graph({
    entity: SellerBrandLink.entryPoint,
    fields: ["*", "brand.*"],
    filters: { seller_id: sellerId },
  })

  const brandAssociations = brandLinks.map((link: any) => ({
    brand_id: link.brand?.id || link.brand_id || link.brand?.brand_id,
    name: link.brand?.name,
    handle: link.brand?.handle,
  }))

  const brandAssociationsResult = (result as any).brandAssociations || {}
  const addedBrandIds = brandAssociationsResult.added || brandAssociationsResult.created || []
  const deletedBrandIds = brandAssociationsResult.removed || brandAssociationsResult.deleted || []

  res.json({
    seller: (result as any).seller,
    member: (result as any).member,
    companySpocs: (result as any).companySpocs,
    kycDocuments: (result as any).kycDocuments,
    brandAssociations: {
      updated: {
        count: addedBrandIds.length,
        brand_ids: addedBrandIds,
      },
      deleted: {
        count: deletedBrandIds.length,
        brand_ids: deletedBrandIds,
      },
      brand_associations: brandAssociations,
    },
    bankDetail: (result as any).bankDetail,
  })
}

