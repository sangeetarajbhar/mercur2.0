import {
  AdditionalData,
  UpdateCartDataDTO,
} from "@medusajs/framework/types"

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {

  res.status(400).json({ message: "Invalid request" })
}

export const POST = async (
  req: MedusaRequest<UpdateCartDataDTO & AdditionalData>,
  res: MedusaResponse
) => {

  res.status(400).json({ message: "Invalid request" })
}
