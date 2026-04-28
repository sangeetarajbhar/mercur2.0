import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import runInventoryFeedSftpJob from "../../jobs/run-inventory-feed-sftp"
import runProductVariantFeedSftpJob from "../../jobs/run-product-variant-feed-sftp"


export const GET = async (
  req: MedusaRequest<any>,
  res: MedusaResponse
) => {

  await runProductVariantFeedSftpJob(req.scope)
  res.json({
    a: 'asdf'
  })
}

type TestRequestCreatedEventBody = {
  type?: string
  submitter_id?: string
  reviewer_id?: string | null
  reviewer_note?: string | null
  status?: "pending" | "accepted" | "rejected"
  data?: Record<string, unknown>
}

export const POST = async (
  req: MedusaRequest<TestRequestCreatedEventBody>,
  res: MedusaResponse
) => {
  const eventBus = req.scope.resolve(Modules.EVENT_BUS)

  const body = req.body || {}
  const type = body.type || "seller"
  const eventName = `requests.${type}.created`

  const payload = {
    id: `req_test_${Date.now()}`,
    type,
    submitter_id: body.submitter_id || "test_submitter",
    reviewer_id: body.reviewer_id || null,
    reviewer_note: body.reviewer_note || null,
    status: body.status || "pending",
    created_at: new Date(),
    updated_at: new Date(),
    data:
      body.data || {
        seller: { name: "Test Seller Pvt Ltd" },
        member: { name: "Test Seller Admin" },
        provider_identity_id: "admin@example.com",
      },
  }

  await eventBus.emit({
    name: eventName,
    data: payload,
  })

  return res.json({
    ok: true,
    message: "request-created event emitted",
    event: eventName,
    payload,
  })
}