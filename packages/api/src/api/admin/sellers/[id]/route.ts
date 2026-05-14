import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import SellerBrandLink from "../../../../links/seller-brand"
import { constructS3Url } from "../../../../shared/utils/common"
import { updateSellerWorkflow } from "../../../../workflows/seller/workflows"
import { expandSellerGraphRowForAdmin } from "../expand-seller-for-admin"
import type { AdminUpdateSellerType } from "../validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [seller],
  } = await query.graph(
    {
      entity: "seller",
      fields: req.queryConfig.fields,
      filters: { id: req.params.id },
    },
    { throwIfKeyNotFound: true }
  )

  const limit = req.query?.limit ? Number(req.query.limit) : 10000
  const offset = req.query?.offset ? Number(req.query.offset) : 0

  const { data: brandLinks, metadata: { count, take, skip } = {} as any } = await query.graph({
    entity: SellerBrandLink.entryPoint,
    fields: ["*", "brand.*"],
    filters: { seller_id: req.params.id },
    pagination: { skip: offset, take: limit },
  })

  const brandAssociations = brandLinks.map((link: any) => ({
    brand_id: link.brand?.id || link.brand_id || link.brand?.brand_id,
    name: link.brand?.name,
    handle: link.brand?.handle,
  }))

  const normalizePath = (path: string | null | undefined): string => {
    if (!path) return ""
    return path.startsWith("/") ? path.slice(1) : path
  }

  const base = expandSellerGraphRowForAdmin(seller)

  const transformedSeller = {
    ...base,
    members: base.members?.map((member: any) => ({
      ...member,
      photo: member.photo ? constructS3Url(normalizePath(member.photo)) : member.photo,
    })),
    kyc_documents: base.kyc_documents?.map((doc: any) => ({
      ...doc,
      file_url: doc.file_url ? constructS3Url(normalizePath(doc.file_url)) : doc.file_url,
    })),
    brand_associations: brandAssociations,
    brand_associations_count: count || brandAssociations.length,
    brand_associations_limit: take || limit,
    brand_associations_offset: skip ?? offset,
  }

  res.json({ seller: transformedSeller })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateSellerType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  await updateSellerWorkflow(req.scope).run({
    input: {
      id,
      ...req.validatedBody,
    },
  })

  const {
    data: [seller],
  } = await query.graph({
    entity: "seller",
    fields: req.queryConfig.fields,
    filters: { id },
  })

  res.json({ seller: expandSellerGraphRowForAdmin(seller) })
}

