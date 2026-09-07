import {
  CreatePriceListPriceWorkflowDTO,
  CreatePriceListWorkflowInputDTO,
  CreatePriceListsWorkflowStepDTO,
  PriceListDTO,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"

import { EXTEND_PRICE_MODULE } from "../../../modules/pricing-extend"
import {
  createCustomPriceListsStep,
  validatePercentExtendPriceLinkStep,
  validateVariantPriceLinksStep,
} from "../steps"

export interface ExtendedCreatePriceListPriceWorkflowDTO
  extends CreatePriceListPriceWorkflowDTO {
  percentage_discount?: number
}

export interface ExtendedCreatePriceListWorkflowInputDTO
  extends Omit<CreatePriceListWorkflowInputDTO, "prices"> {
  prices?: ExtendedCreatePriceListPriceWorkflowDTO[]
}

export type CreatePriceListsWorkflowInput = {
  price_lists_data: ExtendedCreatePriceListWorkflowInputDTO[]
}

export const createPriceListsWorkflowId = "create-custom-price-lists"

export const createCustomPriceListsWorkflow = createWorkflow(
  createPriceListsWorkflowId,
  (
    input: WorkflowData<CreatePriceListsWorkflowInput>
  ): WorkflowResponse<PriceListDTO[]> => {
    const variantPriceMap = validateVariantPriceLinksStep(input.price_lists_data)

    const stepInput: CreatePriceListsWorkflowStepDTO = {
      data: input.price_lists_data as CreatePriceListWorkflowInputDTO[],
      variant_price_map: variantPriceMap,
    }
    const createdPriceLists = createCustomPriceListsStep(stepInput)

    const pricesWithDiscount = transform(
      { createdPriceLists, input },
      ({ createdPriceLists, input }) =>
        createdPriceLists
          .map((pl, plIndex) =>
            (pl.prices ?? []).map((price, priceIndex) => ({
              price_id: price.id,
              percentage_discount:
                input.price_lists_data[plIndex]?.prices?.[priceIndex]
                  ?.percentage_discount,
            }))
          )
          .flat()
          .filter((entry) => entry.percentage_discount != null)
    )

    const validatePercentage = validatePercentExtendPriceLinkStep({
      pricesWithDiscount,
    })

    const links = transform({ validatePercentage }, ({ validatePercentage }) =>
      validatePercentage.map((link) => ({
        [Modules.PRICING]: { price_id: link.price_id },
        [EXTEND_PRICE_MODULE]: { extend_price_id: link.extend_price_id },
      }))
    )

    createRemoteLinkStep(links)

    return new WorkflowResponse(createdPriceLists)
  }
)
