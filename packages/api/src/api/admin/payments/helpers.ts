import { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

export const refetchPayment = async (
  paymentId: string,
  scope: MedusaContainer,
  fields: string[]
) => {
  try {
    const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const queryObject = remoteQueryObjectFromString({
      entryPoint: "payment",
      variables: {
        filters: { id: paymentId },
      },
      fields: fields,
    })

    const payments = await remoteQuery(queryObject)
    return payments[0]
  } catch (error) {
    console.error(error)
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Payment not found")
  }
}
