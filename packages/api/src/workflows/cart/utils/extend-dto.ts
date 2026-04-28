import { CreateLineItemForCartDTO } from "@medusajs/framework/types"

export interface ExtendedLineItem extends CreateLineItemForCartDTO {
    seller_id: string
  }