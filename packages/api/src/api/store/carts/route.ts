import { createCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  AdditionalData,
  CreateCartWorkflowInputDTO,
  HttpTypes,
} from "@medusajs/framework/types"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { refetchCart } from "../v2/carts/helpers"
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export const POST = async (
    req: AuthenticatedMedusaRequest<
      HttpTypes.StoreCreateCart & AdditionalData,
      HttpTypes.SelectParams
    >,
    res: MedusaResponse<HttpTypes.StoreCartResponse>
  ) => {
    const customer_id = req.auth_context?.actor_id

    // If user is logged in, check for existing active cart
    if (customer_id) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

      const { data: existingCarts } = await query.graph({
        entity: 'cart',
        filters: {
          customer_id: customer_id,
          completed_at: null // Only get active carts (not completed)
        },
        fields: ['id', 'completed_at', 'customer_id', 'created_at'],
      })

      // If active cart exists, return it
      if (existingCarts && existingCarts.length > 0) {
        // Sort by created_at to get the most recent active cart
        const activeCart = existingCarts?.[0]
        if (activeCart) {
          const cart = await refetchCart(activeCart.id, req.scope, req.queryConfig.fields)
          return res.status(200).json({ cart: cart })
        }
      }
    }

    // No active cart found or user is not logged in - create a new cart
    const workflowInput = {
      ...req.validatedBody,
      customer_id: customer_id,
    }

    const { result } = await createCartWorkflow(req.scope).run({
      input: workflowInput as CreateCartWorkflowInputDTO,
    })

    const cart = await refetchCart(result.id, req.scope, req.queryConfig.fields)

    res.status(200).json({ cart })
  }
