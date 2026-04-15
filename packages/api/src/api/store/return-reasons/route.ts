import {
    ContainerRegistrationKeys,
    remoteQueryObjectFromString,
  } from "@medusajs/framework/utils"
  import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
  import { HttpTypes } from "@medusajs/framework/types"
  
  export const GET = async (
    req: MedusaRequest<HttpTypes.FindParams>,
    res: MedusaResponse<HttpTypes.StoreReturnReasonListResponse>
  ) => {
    const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

    const queryObject = remoteQueryObjectFromString({
      entryPoint: "return_reason",
      variables: {
        filters: {
          ...req.filterableFields,
          parent_return_reason_id: {
            $eq: null
          },
          value: {
            $nin: ['partial_delivery', 'try_and_buy']
          }
        },
        ...req.queryConfig.pagination,
      },
      fields: req.queryConfig.fields,
    })
  
    const { rows: return_reasons, metadata } = await remoteQuery(queryObject)

    res.json({
      return_reasons: return_reasons,
      count: metadata.count,
      offset: metadata.skip,
      limit: metadata.take,
    })
  }
  