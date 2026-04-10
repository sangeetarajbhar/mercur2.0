import {
  AuthenticatedMedusaRequest,
  // refetchEntities, // Commented out - replaced with query.graph
  // refetchEntity,
} from "@medusajs/framework/http"
import { MedusaPricingContext } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { NextFunction } from "express"
import { refetchEntity, refetchEntities } from "../../../utils/refetch-entity"

export function setPricingContext() {
  return async (req: AuthenticatedMedusaRequest, _, next: NextFunction) => {
    const withCalculatedPrice = req.queryConfig.fields.some((field) =>
      field.startsWith("variants.calculated_price")
    )
    if (!withCalculatedPrice) {
      return next()
    }

    // We validate the region ID in the previous middleware
    // Old code using refetchEntity (causing errors)
    // const region = await refetchEntity(
    //   "region",
    //   req.filterableFields.region_id!,
    //   req.scope,
    //   ["id", "currency_code"]
    // )
    const region = await refetchEntity("region", req.filterableFields.region_id!, req.scope, ["id", "currency_code"])

    if (!region) {
      try {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Region with id ${req.filterableFields.region_id} not found when populating the pricing context`
        )
      } catch (e) {
        return next(e)
      }
    }

    const pricingContext: MedusaPricingContext = {
      region_id: region.id,
      currency_code: region.currency_code,
    }

    // Find all the customer groups the customer is a part of and set
    if (req.auth_context?.actor_id) {
      // Old code using refetchEntities (causing errors)
      const customerGroups = await refetchEntities(
        "customer_group",
        { customers: { id: req.auth_context.actor_id } },
        req.scope,
        ["id"]
      )
      
      pricingContext.customer = { groups: [] }
      customerGroups.map((cg) =>
        pricingContext.customer?.groups?.push({ id: cg.id })
      )

      // New code using query.graph
      // try {
      //   const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      //   const { data: customerGroups } = await query.graph({
      //     entity: 'customer_group',
      //     fields: ['id'],
      //     filters: {
      //       customers: { id: req.auth_context.actor_id }
      //     },
      //   })

      //   pricingContext.customer = { groups: [] }
      //   customerGroups?.forEach((cg: { id: string }) =>
      //     pricingContext.customer?.groups?.push({ id: cg.id })
      //   )
      // } catch (error) {
      //   // If query fails, continue without customer groups
      //   console.error('Failed to fetch customer groups:', error)
      //   pricingContext.customer = { groups: [] }
      // }
    }

    req.pricingContext = pricingContext
    return next()
  }
}
