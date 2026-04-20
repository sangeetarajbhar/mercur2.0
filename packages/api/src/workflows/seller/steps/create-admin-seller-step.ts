import { toHandle, Modules, MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { MercurModules, SellerRole } from '@mercurjs/types'
import { generateUniqueBarcode } from '../../../api/admin/sellers/utils'
import { BRAND_MODULE } from '../../../modules/brand'
import {
  CreateAdminSellerOnboardingInput,
  MemberRole,
  SellerEvents,
} from '../../../types/seller'
import SellerModuleService from '../../../modules/seller/service'

export type { CreateAdminSellerOnboardingInput } from '../../../types/seller'

export const createAdminSellerStep = createStep(
  'create-admin-seller',
  async (input: CreateAdminSellerOnboardingInput, { container }) => {
    const service = container.resolve<SellerModuleService>(MercurModules.SELLER)

    const eventBus = container.resolve(Modules.EVENT_BUS)
    const link = container.resolve("link")

    // Exclude nested arrays/objects to prevent duplicates
    // These will be created by dedicated workflow steps
    const {
      company_spocs,
      kyc_documents,
      bank_detail,
      brand_associations,
      member,
      ...sellerPayload
    } = input

    // Generate unique barcode if not provided
    const barcode = input.barcode || await generateUniqueBarcode(input.name, service)

    const memberRows = Array.isArray(member) ? member : [member]

    // Do not nest `members` on createSellers: many-to-many + pivot (SellerMember) is not
    // reliably created that way and can yield "Cannot set field 'id' of Seller member to null".
    // Same pattern as createSellerAccountWorkflow: seller → members → seller_member rows.
    const seller = await service.createSellers({
      ...sellerPayload,
      barcode,
      handle: toHandle(input.name),
    })

    const memberCreatePayload = memberRows.map((m, index) => ({
      email: m.email,
      name: m.name,
      bio: m.bio ?? null,
      phone: m.phone ?? null,
      photo: m.photo ?? null,
      locale: m.locale ?? null,
      is_active: m.is_active ?? true,
      metadata: m.metadata ?? null,
      role: index === 0 ? MemberRole.OWNER : MemberRole.ADMIN,
    }))

    const createdMembersResult = await service.createMembers(memberCreatePayload)
    const createdMembers = Array.isArray(createdMembersResult)
      ? createdMembersResult
      : [createdMembersResult]

    await service.createSellerMembers(
      createdMembers.map((m, i) => ({
        seller_id: seller.id,
        member_id: m.id,
        role_id: SellerRole.SELLER_ADMINISTRATION,
        is_owner: i === 0,
      }))
    )

    const [sellerWithMembers] = await service.listSellers(
      { id: seller.id },
      { relations: ['members'] }
    )

    // 2. Link seller to brands using the module link
    if (input.brand_associations && input.brand_associations.length > 0) {
      // Filter out any invalid brand associations
      const validBrandAssociations = input.brand_associations.filter(ba => ba && ba.brand_id)

      const linksToCreate = validBrandAssociations.map((ba) => ({
        [MercurModules.SELLER]: { seller_id: seller.id },
        [BRAND_MODULE]: { brand_id: ba.brand_id }
      }))
      // Create links one by one
      if (linksToCreate.length) {
        await link.create(linksToCreate)
      }
    }

    await eventBus.emit({
      name: SellerEvents.SELLER_CREATED,
      data: {
        id: sellerWithMembers.id,
        seller: sellerWithMembers,
      },
    })

    return new StepResponse(sellerWithMembers, sellerWithMembers.id)
  },
  async (id: string, { container }) => {
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Admin seller ID is required for compensation'
      )
    }

    const service = container.resolve(MercurModules.SELLER)

    await service.softDeleteSellers([id])
  }
)
