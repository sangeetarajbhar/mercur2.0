import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
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