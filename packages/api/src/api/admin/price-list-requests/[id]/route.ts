import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import { randomUUID } from "crypto"

import {
  PRICE_LIST_IMPORT_REQUEST_MODULE,
  PriceListImportRequestModuleService,
} from "../../../../modules/price-list-import-request"
import { acceptPriceListRequestBackgroundWorkflow } from "../../../../workflows/price-list/workflows"
import { AdminReviewPriceListRequestType } from "../validators"

/**
 * @oas [get] /admin/price-list-requests/{id}
 * operationId: "AdminGetPriceListRequestById"
 * summary: "Get price list import request by id"
 * x-authenticated: true
 * tags:
 *   - Admin Price List Requests
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const requestService =
    req.scope.resolve<PriceListImportRequestModuleService>(
      PRICE_LIST_IMPORT_REQUEST_MODULE
    )

  const requests = await requestService.listPriceListImportRequests(
    { id: req.params.id },
    { take: 1 }
  )
  const request = requests[0]

  if (!request) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Price list import request ${req.params.id} not found`
    )
  }

  res.json({ price_list_request: request })
}

/**
 * @oas [post] /admin/price-list-requests/{id}
 * operationId: "AdminReviewPriceListRequestById"
 * summary: "Accept or reject a price list import request"
 * x-authenticated: true
 * tags:
 *   - Admin Price List Requests
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminReviewPriceListRequestType>,
  res: MedusaResponse
) {
  const requestService =
    req.scope.resolve<PriceListImportRequestModuleService>(
      PRICE_LIST_IMPORT_REQUEST_MODULE
    )

  const requests = await requestService.listPriceListImportRequests(
    { id: req.params.id, status: "pending" },
    { take: 1 }
  )
  const request = requests[0]

  if (!request) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      "This request is already reviewed or does not exist"
    )
  }

  if (req.validatedBody.status === "rejected") {
    await requestService.updatePriceListImportRequests({
      id: req.params.id,
      reviewer_id: req.auth_context.actor_id,
      reviewer_note: req.validatedBody.reviewer_note,
      status: "rejected",
    })

    return res.json({ id: req.params.id, status: "rejected" })
  }

  // Accept: trigger background processing
  const reviewerId = req.auth_context.actor_id
  if (!reviewerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Reviewer id is required to accept this request"
    )
  }

  const transactionId = randomUUID()
  const { result } = await acceptPriceListRequestBackgroundWorkflow.run({
    input: {
      request_id: req.params.id,
      reviewer_id: reviewerId,
      reviewer_note: req.validatedBody.reviewer_note,
      user_id: request.submitter_id,
      transaction_id: transactionId,
      channel: "seller_feed",
    },
    container: req.scope,
  })

  return res.status(202).json({
    id: req.params.id,
    status: result.status || "processing",
    transaction_id: transactionId,
    message:
      result.message || "Price list request accept started in background.",
  })
}
