import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ProductEvents } from '../shared/events/product-events'
import { SEARCH_MODULE } from '../modules/search'
import SearchModuleService from '../modules/search/service'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'


export default async function searchChangeHandler(
  args: SubscriberArgs<{ ids: string[] }>
) {
  try {
    // Deduplicate product IDs to prevent processing the same product twice
    // This can happen when multiple hooks emit PRODUCTS_CHANGED for the same update
    const uniqueProductIds = [...new Set(args.event.data.ids)]
    
    if (uniqueProductIds.length === 0) {
      return
    }
    
    // Resolve search module service
    const searchService = args.container.resolve<SearchModuleService>(SEARCH_MODULE)

    const query = args.container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: products } = await query.graph({
      entity: 'product',
      fields: ['id', 'status', 'deleted_at'],
      filters: { id: uniqueProductIds }
    })

    const published = products
      .filter((p: any) => p.status === 'published' && !p.deleted_at)
      .map((p: any) => p.id)

    // For YesPlz: for non-published statuses we want to keep the product but mark it inactive.
    const inactive = products
      .filter((p: any) => p.status !== 'published' && !p.deleted_at)
      .map((p: any) => p.id)

    // For deleted products: we still remove them from the search provider.
    const deleted = products
      .filter((p: any) => Boolean(p.deleted_at))
      .map((p: any) => p.id)

    // Use productPublish + syncUpdateIsActive + unpublishProduct
    // Note: syncUpdateIsActive returns an object (counts), so we keep the promises type broad.
    const promises: Array<Promise<unknown>> = []
    
    if (published.length > 0) {
      promises.push(searchService.productPublish(args.container, published))
    }
    
    if (inactive.length > 0) {
      promises.push(
        searchService.syncUpdateIsActive(
          args.container,
          inactive.map((productId) => ({ productId, isActive: false }))
        )
      )
    }

    if (deleted.length > 0) {
      promises.push(searchService.unpublishProduct(args.container, deleted))
    }
    
    await Promise.all(promises)
  } catch (error: any) {
    console.error('[Search] ❌ Error in search change handler:', error.message)
  }
}

export const config: SubscriberConfig = {
  event: ProductEvents.PRODUCTS_CHANGED,
  context: { subscriberId: 'search-change-handler' }
}

