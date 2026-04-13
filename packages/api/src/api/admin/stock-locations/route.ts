import {AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse} from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminCreateStockLocationType } from "../../../api/admin/stock-locations/validators";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: stockLocations, metadata } = await query.graph({
    entity: 'stock_location',
    fields: ['seller.*', ...req.queryConfig.fields],
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination
  })

  // List all admin & vendor created stock locations
  // const filteredStockLocations = stockLocations.filter(
  //   (stockLocation) => stockLocation.seller
  // )

  res.json({
    stock_locations: stockLocations,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminCreateStockLocationType>,
  res: MedusaResponse
) => {
  res.status(200).json({ stock_location: [] })
  // const { result } = await createStockLocationsWorkflow(req.scope).run({
  //   input: { locations: [req.validatedBody] },
  // })
  //
  // const stockLocation = await refetchStockLocation(
  //   result[0].id,
  //   req.scope,
  //   req.queryConfig.fields
  // )
  //
  // res.status(200).json({ stock_location: stockLocation })
}
