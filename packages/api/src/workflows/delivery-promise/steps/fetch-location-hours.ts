import stockLocationExtensionLink from '../../../links/stock-location-stock-location-extension'

// Location operating hours type
export type LocationOperatingHours = {
  startTime: string | null
  endTime: string | null
}

// Fetch location operating hours
export async function fetchLocationOperatingHours(
  query: any,
  location_id: string
): Promise<LocationOperatingHours> {
  const { data: locationExtensionData } = await query.graph({
    entity: stockLocationExtensionLink.entryPoint,
    fields: ['stock_location_extension.start_time', 'stock_location_extension.end_time'],
    filters: { stock_location_id: location_id }
  })

  let startTime: string | null = null
  let endTime: string | null = null

  if (locationExtensionData && locationExtensionData.length > 0) {
    const locationExtension = locationExtensionData[0]
    if (locationExtension?.stock_location_extension) {
      startTime = locationExtension.stock_location_extension.start_time
      endTime = locationExtension.stock_location_extension.end_time
    }
  }

  return { startTime, endTime }
}

