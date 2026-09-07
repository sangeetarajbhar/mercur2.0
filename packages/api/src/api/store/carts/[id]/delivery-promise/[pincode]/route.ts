import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import {getCartPromise} from "../../../../../../workflows/delivery-promise/workflows/get-cart-promise";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id, pincode } = req.params

  if (!id || !pincode) {
    return res.status(400).json({status: false, message: "Missing cart id or pincode", error: "validation error" })
  }

  try {
    const data = await getCartPromise({ scope: req.scope, cart: {id: id, shipping_address: {postal_code: ""}}, postal_code: pincode })

    if (!data || !data.status) {
      return res.status(200).json(data)
    }

    // Destructure to remove status inside the data
    const { status, ...rest } = data
    return res.status(200).json({ status: status, data: rest })
  } catch (error) {
    console.log('Get cart delivery promise error: ', error)
    return res.status(500).json({ status: false, message: "Something went wrong", error: "Failed to get delivery promise" })
  }
}
