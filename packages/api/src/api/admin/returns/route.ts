import { beginReturnOrderWorkflow } from "@medusajs/medusa/core-flows"
import { HttpTypes } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  promiseAll,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { constructS3Url, extractRelativePath } from "../../../shared/utils/common"

export const GET = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminOrderFilters>,
  res: MedusaResponse<HttpTypes.AdminReturnsResponse>
) => {
  const orderModuleService = req.scope.resolve(Modules.ORDER)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  const queryObject = remoteQueryObjectFromString({
    entryPoint: "returns",
    variables: {
      filters: {
        ...req.filterableFields,
      },
      ...req.queryConfig.pagination,
    },
    fields: [...req.queryConfig.fields],
  })

  const { rows: returns, metadata } = await remoteQuery(queryObject)

  for(const r of returns){
    if(r.items && r.items[0].item){
      const lineItem = await orderModuleService.retrieveOrderLineItem(r.items[0].item.id)
      const order = await orderModuleService.retrieveOrder(r.order_id)
      r.order_details = lineItem
      r.order = order
    }

    // Transform thumbnail to full CDN URL if it exists
    if (r.thumbnail && typeof r.thumbnail === 'string') {
      r.thumbnail = constructS3Url(extractRelativePath(r.thumbnail))
    }

    // Transform any image URLs in metadata if they exist
    if (r.metadata?.images && Array.isArray(r.metadata.images)) {
      r.metadata.images = r.metadata.images.map((imageUrl: string) =>
        constructS3Url(extractRelativePath(imageUrl))
      )
    }
  }

  res.json({
    returns,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}
