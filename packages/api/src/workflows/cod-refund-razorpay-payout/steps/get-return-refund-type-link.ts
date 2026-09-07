import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import ReturnRefundTypeLinkModuleService from "../../../modules/return-refund-type-link/service"
import { RETURN_REFUND_TYPE_LINK_MODULE } from "../../../modules/return-refund-type-link"
import { ReturnRefundTypeLinkStatus } from "../../../utils/constants/return_refund_type_link"

export type GetReturnRefundTypeLinkStepInput = {
  return_id: string
}

export type GetReturnRefundTypeLinkStepOutput = {
  returnRefundLink: {
    id: string
    return_id: string
    type: string
    type_id: string
    customer_id: string
    status: string
    created_by: string
    created_at: Date
  }
  type: string
  typeId: string
}

export const getReturnRefundTypeLinkStep = createStep(
  "get-return-refund-type-link-for-cod",
  async (input: GetReturnRefundTypeLinkStepInput, { container }) => {
    const service =
      container.resolve<ReturnRefundTypeLinkModuleService>(
        RETURN_REFUND_TYPE_LINK_MODULE
      )

    const links = await service.listReturnRefundTypeLinks(
      {
        return_id: input.return_id,
        status: ReturnRefundTypeLinkStatus.ACTIVE,
      } as any,
      {
        select: [
          "id",
          "return_id",
          "type",
          "type_id",
          "customer_id",
          "status",
          "created_by",
          "created_at",
        ],
      } as any
    )

    if (!links || links.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "COD refund requires a linked return refund type link (bank/UPI). Add and verify bank/UPI when creating the return."
      )
    }

    const returnRefundLink = links[0] as any
    return new StepResponse({
      returnRefundLink,
      type: returnRefundLink.type,
      typeId: returnRefundLink.type_id,
    })
  }
)

