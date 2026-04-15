import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'
import type { HttpTypes } from "@medusajs/framework/types"
import { z } from "zod"

// Define locally since import from deep dist path is flaky
export const AdminImportProducts = z.object({
  file_key: z.string(),
  originalname: z.string(),
  seller_id: z.string().optional(), // Enhanced property
})

export type AdminImportProductsType = z.infer<typeof AdminImportProducts>
import { enhancedImportProductsAsChunksWorkflow } from "../../../../workflows/product/workflows/enhanced-import/enhanced-import-products-as-chunks"

/**
 * Enhanced product import API endpoint that follows Medusa's exact pattern.
 *
 * POST /admin/products/enhanced-import
 *
 * This endpoint mirrors Medusa's core import API exactly:
 * - Same request validation (AdminImportProductsType)
 * - Same response format (HttpTypes.AdminImportProductResponse)
 * - Same error handling (automatic via validators and workflow)
 *
 * Enhancement: Adds seller-brand authorization and dynamic attribute processing.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdminImportProductsType>,
  res: MedusaResponse<HttpTypes.AdminImportProductResponse>
) => {
  // Get seller ID from request body (our enhancement) or fallback to authenticated user context
  const sellerId = req.validatedBody.seller_id || (req.user as any)?.seller_id

  // Use our enhanced workflow (same pattern as Medusa's imports route)
  const { result, transaction } = await enhancedImportProductsAsChunksWorkflow(
    req.scope
  ).run({
    input: {
      filename: req.validatedBody.originalname,
      fileKey: req.validatedBody.file_key,
      sellerId, // Our enhancement
    },
  })

  res
    .status(202)
    .json({ transaction_id: transaction.transactionId, summary: result })
}