import { getOrderDetailWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HttpTypes } from "@medusajs/framework/types"
import { transformOrderThumbnails } from "../../../utils/middlewares/products/transform-image-urls"

// TODO: Do we want to apply some sort of authentication here? My suggestion is that we do
export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse<HttpTypes.StoreOrderResponse>
) => {
  let resolution = "3x";

  // Extract resolution from raw query fields string (before transformation)
  if (req.query.fields && typeof req.query.fields === 'string') {
    const fieldsString = req.query.fields;
    
    // Look for resolution=<value> pattern in the fields string
    const resolutionMatch = fieldsString.match(/resolution=(\w+)/);
    if (resolutionMatch) {
      resolution = resolutionMatch[1];
    }
    
    // Also check for thumbnail_resolution=<value>
    const thumbnailResolutionMatch = fieldsString.match(/thumbnail_resolution=(\w+)/);
    if (thumbnailResolutionMatch) {
      resolution = thumbnailResolutionMatch[1];
    }
  }

  // Safety check: Remove resolution from queryConfig.fields array if it somehow got through
  // (Medusa's validator should already filter this out, but this is a safeguard)
  if (req.queryConfig?.fields && Array.isArray(req.queryConfig.fields)) {
    req.queryConfig.fields = req.queryConfig.fields.filter((field) => {
      if (typeof field === 'string') {
        return !field.includes('resolution=') && !field.includes('thumbnail_resolution=');
      }
      return true;
    });
  }

  const workflow = getOrderDetailWorkflow(req.scope)
  const { result } = await workflow.run({
    input: {
      fields: req.queryConfig.fields,
      order_id: req.params.id,
      filters: {
        is_draft_order: false,
      },
    },
  })

  // Transform thumbnails based on extracted resolution
  transformOrderThumbnails(result, resolution)

  res.status(200).json({ order: result as HttpTypes.StoreOrder })
}
