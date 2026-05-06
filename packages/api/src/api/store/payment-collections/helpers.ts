import {
  MedusaContainer,
  PaymentCollectionDTO,
} from "@medusajs/framework/types"
import { refetchEntity } from "../../utils/refetch-entity"

export const refetchPaymentCollection = async (
  id: string,
  scope: MedusaContainer,
  fields: string[]
): Promise<PaymentCollectionDTO> => {
  const paymentCollection = (await refetchEntity(
    "payment_collection",
    id,
    scope,
    fields
  )) as PaymentCollectionDTO & {
    authorized_amount?: PaymentCollectionDTO["authorized_amount"] | null
  }

  return {
    ...paymentCollection,
    authorized_amount: paymentCollection.authorized_amount,
  }
}
