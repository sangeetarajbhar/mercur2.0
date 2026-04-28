import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { updateZoneTimingWorkflow } from '../workflows/zone/workflows/update-zone-timing'
import stockLocationStockLocationExtension from '../links/stock-location-stock-location-extension'

export default async function zoneTimingUpdateHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  console.log('zone-timing-update subscriber triggered with event:', event)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  
  // Get the extension ID from the event
  const extensionId = event.data.id
  
  if (!extensionId) {
    console.log('No extension ID found, returning early')
    return
  }

  // Fetch the stock_location_id from the extension
  const { data: extensions } = await query.graph({
    entity: stockLocationStockLocationExtension.entryPoint,
    fields: ['stock_location_id'],
    filters: { stock_location_extension_id: extensionId },
  })

  if (!extensions || extensions.length === 0) {
    return
  }

  const location_id = extensions[0].stock_location_id
  
  if (!location_id) {
    return
  }

  // Run the workflow to update all zones for this location
  await updateZoneTimingWorkflow(container).run({
    input: {
      location_id,
      updated_by: 'system' // System triggered update
    }
  })
}

export const config: SubscriberConfig = {
  event: 'stock-location-extension.updated',
  context: {
    subscriberId: 'zone-timing-update-handler'
  }
}
