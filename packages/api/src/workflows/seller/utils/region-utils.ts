import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework"

/**
 * Resolve the default region ID (first region).
 * Keeps behavior consistent with existing code paths that pick the first region.
 */
export async function fetchDefaultRegionId(scope: MedusaContainer): Promise<string> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id"],
    filters: {},
    pagination: { take: 1 },
  })

  const regionId = regions?.[0]?.id
  if (!regionId) {
    throw new Error("No region found for pricing context")
  }
  return regionId
}

