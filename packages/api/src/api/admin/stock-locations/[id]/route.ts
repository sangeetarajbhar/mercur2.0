import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { AdminGetStockLocationParamsType } from "../validators"
import { HttpTypes } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { refetchStockLocation } from "../helpers"

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetStockLocationParamsType>,
  res: MedusaResponse<HttpTypes.AdminStockLocationResponse>
) => {
  const { id } = req.params

  const stockLocation = await refetchStockLocation(
    id,
    req.scope,
    req.queryConfig.fields
  )

  if (!stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Stock location with id: ${id} was not found`
    )
  }

  // Append the S3 url
  const S3_BASE_URL = process.env.S3_FILE_URL
  if (stockLocation?.stock_location_section?.stock_location_documents && Array.isArray(stockLocation.stock_location_section.stock_location_documents)) {
    stockLocation.stock_location_section.stock_location_documents =
      stockLocation.stock_location_section.stock_location_documents.map((doc) => ({
        ...doc,
        pdf_url: doc.pdf_url
          ? /^(https?:\/\/|data:)/i.test(doc.pdf_url)
            ? doc.pdf_url
            : `${S3_BASE_URL}/${doc.pdf_url.replace(/^\/+/, '')}`
          : doc.pdf_url,
      }))
  }

  res.status(200).json({ stock_location: stockLocation })
}
