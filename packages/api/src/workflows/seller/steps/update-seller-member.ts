import { MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { SELLER_MODULE, SellerModuleService } from '../../../modules/seller'

export const updateSellerMemberStep = createStep<any, any, any>(
  "update-seller-member",
  async ({ member, sellerId }, { container }) => {
    const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)
    // Fetch the existing member (assuming only one main member per seller in this flow)
    const existingMembers = await sellerModuleService.listMembers({ seller_id: sellerId })
    const existing = existingMembers[0]
    
    // Prevent email updates - email is used for authentication
    if (member?.email !== undefined && member.email !== existing.email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Email cannot be updated. Email is used for authentication and cannot be changed.'
      )
    }
    
    // Save previous state for rollback
    const prev = { ...existing }
    
    // Remove email from update payload to prevent accidental updates
    const { email, ...memberUpdateData } = member || {}
    
    // Update the member (preserve existing email)
    const updated = await sellerModuleService.updateMembers({
      ...existing,
      ...memberUpdateData,
      email: existing.email, // Always use existing email
      seller_id: sellerId,
    })
    return new StepResponse(updated, prev)
  },
  async (prevMember, { container }) => {
    if (!prevMember) return
    const sellerModuleService: SellerModuleService = container.resolve(SELLER_MODULE)
    // Rollback: restore previous member data
    await sellerModuleService.updateMembers(prevMember)
  }
)