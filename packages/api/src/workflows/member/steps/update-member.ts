import { MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { MemberDTO, UpdateMemberDTO } from '../../../types/seller'
import { SELLER_MODULE, SellerModuleService } from '../../../modules/seller'

export const updateMemberStep = createStep(
  'update-member',
  async (input: UpdateMemberDTO, { container }) => {
    const service = container.resolve<SellerModuleService>(SELLER_MODULE)

    const previousData = await service.retrieveMember(input.id)

    // Prevent email updates - email is used for authentication
    if (input.email !== undefined && input.email !== previousData.email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Email cannot be updated. Email is used for authentication and cannot be changed.'
      )
    }

    // Remove email from update payload to prevent accidental updates
    const { email, ...updateData } = input

    // Always preserve existing email
    const updatedMember: MemberDTO = await service.updateMembers({
      ...updateData,
      email: previousData.email, // Always use existing email
      id: input.id
    })

    return new StepResponse(updatedMember, previousData as UpdateMemberDTO)
  },
  async (previousData: UpdateMemberDTO, { container }) => {
    const service = container.resolve<SellerModuleService>(SELLER_MODULE)

    await service.updateMembers(previousData)
  }
)
