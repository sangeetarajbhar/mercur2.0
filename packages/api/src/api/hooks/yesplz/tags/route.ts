import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createHmac } from 'crypto'
import { normalizeTags } from './utils/normalize-tags'
import { upsertTags } from './services/upsert-tags'
import { linkTagsToProduct } from './services/link-tags-to-product'

/**
 * POST /hooks/yesplz/tags
 * Webhook endpoint to receive AI-generated tags from YesPlz
 * 
 * Expected payload:
 * {
 *   product_id: string,
 *   tags: string[] | Array<{ value: string, metadata?: any }>
 * }
 * 
 * Authentication: HMAC-SHA256 signature verification (x-zilo-signature header). YESPLZ_WEBHOOK_SECRET must be set.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger')
  
  try {
    // Require webhook secret to be configured
    const webhookSecret = process.env.YESPLZ_WEBHOOK_SECRET
    if (!webhookSecret || String(webhookSecret).trim() === '') {
      logger.warn('[YesPlz Tags Webhook] YESPLZ_WEBHOOK_SECRET is not configured')
      res.status(503).json({
        error: 'Webhook not configured',
        message: 'YESPLZ_WEBHOOK_SECRET must be set to accept webhook requests'
      })
      return
    }

    const signature = req.headers['x-zilo-signature'] as string
    if (!signature) {
      logger.warn('[YesPlz Tags Webhook] No signature provided')
      res.status(403).json({
        error: 'Missing signature',
        message: 'Webhook signature (x-zilo-signature) is required'
      })
      return
    }

    // Verify HMAC-SHA256 signature
    const body = JSON.stringify(req.body, null, 0)
    const hmac = createHmac('sha256', webhookSecret)
    hmac.update(body)
    const computedSignature = hmac.digest('hex')

    if (signature !== computedSignature) {
      logger.warn('[YesPlz Tags Webhook] Invalid signature')
      res.status(403).json({
        error: 'Invalid signature',
        message: 'Webhook signature verification failed'
      })
      return
    }

    logger.info('[YesPlz Tags Webhook] Signature verified')

    // Validate payload
    const { product_id, tags } = req.body as { 
      product_id: string
      tags: string[]
    }

    if (!product_id || typeof product_id !== 'string') {
      logger.warn('[YesPlz Tags Webhook] Missing or invalid product_id')
      res.status(400).json({ 
        error: 'Invalid payload',
        message: 'product_id is required and must be a string'
      })
      return
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      logger.warn('[YesPlz Tags Webhook] Missing or invalid tags array')
      res.status(400).json({ 
        error: 'Invalid payload',
        message: 'tags is required and must be a non-empty array'
      })
      return
    }

    // Validate product exists
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: products } = await query.graph({
      entity: 'product',
      fields: ['id'],
      filters: {
        id: product_id
      }
    })

    if (!products || products.length === 0) {
      logger.warn(`[YesPlz Tags Webhook] Product not found: ${product_id}`)
      res.status(404).json({ 
        error: 'Product not found',
        message: `Product with id ${product_id} does not exist`
      })
      return
    }

    // Normalize tags
    const normalizedTags = normalizeTags(tags)
    
    if (normalizedTags.length === 0) {
      logger.warn('[YesPlz Tags Webhook]  No valid tags after normalization')
      res.status(400).json({ 
        error: 'Invalid payload',
        message: 'No valid tags found after processing'
      })
      return
    }

    logger.info(
      `[YesPlz Tags Webhook] Processing ${normalizedTags.length} tags for product ${product_id}`
    )

    // Upsert tags (find or create)
    const upsertResult = await upsertTags(req.scope, normalizedTags)

    if (upsertResult.tagIds.length === 0) {
      logger.warn('[YesPlz Tags Webhook] No tags were processed successfully')
      res.status(500).json({ 
        error: 'Tag processing failed',
        message: 'Failed to process any tags'
      })
      return
    }

    // Link tags to product (inserts into product_tags junction table)
    await linkTagsToProduct(req.scope, product_id, upsertResult.tagIds)
    logger.info(
      `[YesPlz Tags Webhook] Successfully linked ${upsertResult.tagIds.length} tags to product ${product_id}`
    )

    logger.info(
      `[YesPlz Tags Webhook] Successfully processed ${upsertResult.tagIds.length} tags ` +
      `(${upsertResult.created} created, ${upsertResult.existing} existing) for product ${product_id}`
    )

    // Return success response
    res.status(200).json({ 
      success: true,
      message: `Successfully processed ${upsertResult.tagIds.length} tags for product ${product_id}`,
      product_id,
      tags_processed: upsertResult.tagIds.length,
      tags_created: upsertResult.created,
      tags_existing: upsertResult.existing
    })
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('[YesPlz Tags Webhook] Error processing webhook: ' + errorMessage)
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage
    })
  }
}

