import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { updateAdminSellerWorkflow } from "../../../../../workflows/seller/workflows/update-admin-seller-onboard"
import SellerBrandLink from "../../../../../links/seller-brand"
import { extractUrlPath } from "../../utils"

type UpdateSellerOnboardingInput = {
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

export const POST = async (
  req: AuthenticatedMedusaRequest<UpdateSellerOnboardingInput>,
  res: MedusaResponse
) => {
  const sellerId = req.params.id

  // Check if email is being sent in member data - email cannot be updated
  if (req.validatedBody.member?.email !== undefined) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Email cannot be updated. Email is used for authentication and cannot be changed.'
    )
  }

  // Remove email from member data if present (safety check)
  const { email, ...memberWithoutEmail } = req.validatedBody.member || {}
  
  const { result } = await updateAdminSellerWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      sellerId,
      member: {
        ...memberWithoutEmail,
        photo: extractUrlPath(req.validatedBody.member?.photo) || null,
      },
      kyc_documents: req.validatedBody.kyc_documents?.map((doc) => ({
        id: doc.id, // Include ID for batch processing
        kyc_type: doc.kyc_type,
        value: doc.value,
        file_url: extractUrlPath(doc.file_url),
      })) || [],
      company_spocs: req.validatedBody.company_spocs?.map((spoc) => ({
        id: spoc.id, // Include ID for batch processing
        ...spoc,
      })) || [],
      brand_associations: req.validatedBody.brand_associations ? {
        update: req.validatedBody.brand_associations.update?.filter(ba => ba && ba.brand_id) || [],
        delete: req.validatedBody.brand_associations.delete?.filter(id => id) || []
      } : undefined,
      bank_detail: req.validatedBody.bank_detail ? {
        ...req.validatedBody.bank_detail,
        account_verified: req.validatedBody.bank_detail.account_verified === 'true' || req.validatedBody.bank_detail.account_verified === true
      } : undefined,
    },
  })

  // Fetch brand associations after update
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: brandLinks } = await query.graph({
    entity: SellerBrandLink.entryPoint,
    fields: ['*', 'brand.*'],
    filters: {
      seller_id: sellerId,
    },
  })

  const brandAssociations = brandLinks.map((link) => ({
    brand_id: link.brand?.id || link.brand_id || link.brand?.brand_id,
    name: link.brand?.name,
    handle: link.brand?.handle
  }))

  // Get added and deleted brand information from workflow result
  const brandAssociationsResult = result.brandAssociations || {}
  const addedBrandIds = brandAssociationsResult.added || brandAssociationsResult.created || []
  const deletedBrandIds = brandAssociationsResult.removed || brandAssociationsResult.deleted || []
  
  res.json({ 
    seller: result.seller,
    companySpocs: result.companySpocs,
    kycDocuments: result.kycDocuments,
    brandAssociations: {
      updated: {
        count: addedBrandIds.length,
        brand_ids: addedBrandIds
      },
      deleted: {
        count: deletedBrandIds.length,
        brand_ids: deletedBrandIds
      },
      brand_associations: brandAssociations,
    },
    bankDetail: result.bankDetail
  })
}