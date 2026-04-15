import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { randomUUID } from 'crypto'

import { syncYesPlzInventoryBackgroundWorkflow } from '../../workflows/search/workflows/sync-yesplz-inventory-background'

type RemoteQuery = {
  graph: (args: {
    entity: string
    fields: string[]
    filters: Record<string, string | string[] | undefined>
  }) => Promise<{ data?: Record<string, unknown>[] }>
}

/**
 * Product IDs that have inventory levels at this stock location (via Medusa inventory).
 * Omni/dark-store clustering is not applied here: availability for this location row is what we re-sync.
 */
export async function resolveProductIdsStockedAtLocation(
  query: RemoteQuery,
  stockLocationId: string
): Promise<string[]> {
  const { data: levels } = await query.graph({
    entity: 'inventory_level',
    fields: ['inventory_item_id'],
    filters: {
      location_id: stockLocationId,
    },
  })

  const inventoryItemIds = [
    ...new Set(
      (levels ?? [])
        .map((l: { inventory_item_id?: string }) => l.inventory_item_id)
        .filter(Boolean)
    ),
  ] as string[]

  if (inventoryItemIds.length === 0) {
    return []
  }

  const { data: links } = await query.graph({
    entity: 'product_variant_inventory_item',
    fields: ['variant_id', 'variant.product_id'],
    filters: {
      inventory_item_id: inventoryItemIds,
    },
  })

  return [
    ...new Set(
      (links ?? [])
        .map((r: { variant?: { product_id?: string } }) => r.variant?.product_id)
        .filter(Boolean)
    ),
  ] as string[]
}

/**
 * After stock location availability (status) changes, queue a YesPlz background inventory sync
 * for products stocked at that location — same mechanism as admin YesPlz inventory sync, not product.sync.changed.
 */
export async function emitProductSyncForSearch(
  container: MedusaContainer,
  stockLocationId: string,
  notifyUserId?: string
): Promise<void> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const ids = await resolveProductIdsStockedAtLocation(query, stockLocationId)
  if (ids.length === 0) {
    return
  }

  const user_id =
    notifyUserId || process.env.FEED_NOTIFY_USER_ID || 'admin'
  const transaction_id = randomUUID()

  logger.debug(
    `Queueing YesPlz inventory sync (stock location ${stockLocationId}) for ${ids.length} products (transaction ${transaction_id})`
  )

  await syncYesPlzInventoryBackgroundWorkflow.run({
    container,
    input: {
      user_id,
      transaction_id,
      product_ids: ids,
      channel: 'feed',
    },
  })
}
