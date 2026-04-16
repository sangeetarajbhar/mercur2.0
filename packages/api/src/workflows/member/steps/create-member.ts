import { MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'

import { CreateMemberDTO, MemberDTO } from '../../../types/seller'
import { SELLER_MODULE } from '../../../modules/seller'
import { SellerModuleService } from '../../../modules/seller'

export const createMemberStep = createStep(
  'create-member',
  async (input: CreateMemberDTO, { container }) => {
    const service = container.resolve<SellerModuleService>(SELLER_MODULE)

    const member: MemberDTO = await service.createMembers(input)

    return new StepResponse(member, member.id)
  },
  async (memberId: string, { container }) => {
    if (!memberId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Member ID is required for compensation'
      )
    }

    const service = container.resolve<SellerModuleService>(SELLER_MODULE)

    await service.softDeleteMembers([memberId])
  }
)
