import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  getLocationHierarchiesByParent,
  LocationHierarchyRow,
} from "../../../shared/utils/location-hierarchy"

export type FetchLocationHierarchiesStepInput = {
  parent_location_id: string
}

export type FetchLocationHierarchiesStepOutput = {
  data: LocationHierarchyRow[]
}

export const fetchLocationHierarchiesStep = createStep(
  "fetch-location-hierarchies",
  async (
    input: FetchLocationHierarchiesStepInput,
    { container }
  ): Promise<StepResponse<FetchLocationHierarchiesStepOutput>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const data = await getLocationHierarchiesByParent(
      query,
      input.parent_location_id
    )

    return new StepResponse({ data })
  }
)
