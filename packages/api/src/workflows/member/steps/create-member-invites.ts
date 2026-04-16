import { MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { SELLER_MODULE, SellerModuleService } from '../../../modules/seller'
import { CreateMemberInviteDTO } from '../../../types/seller'

export const createMemberInviteStep = createStep(
  'create-member-invite',
  async (input: CreateMemberInviteDTO, { container }) => {
    const service = container.resolve<SellerModuleService>(SELLER_MODULE)

    const [memberInvite] = await service.createMemberInvites(input)

    return new StepResponse(memberInvite, memberInvite.id)
  },
  async (memberInviteId: string, { container }) => {
    if (!memberInviteId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Member invite ID is required for compensation'
      )
    }

    const service = container.resolve<SellerModuleService>(SELLER_MODULE)

    await service.softDeleteMemberInvites([memberInviteId])
  }
)
