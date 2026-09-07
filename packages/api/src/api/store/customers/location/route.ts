import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { getLocationWithCache, LocationResponse } from '../../../../shared/utils/geocoding-cache'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { lat, lng, place_id, title } = req.query

  if ((!lat || !lng) && !place_id) {
    return res.status(400).json({
      error: 'Must provide either (lat and lng) or place_id'
    })
  }

  const googleLocationService = req.scope.resolve('google_location') as unknown as {
    getAddressFromLatLng: (lat: string, lng: string) => Promise<LocationResponse>
    getAddressFromPlaceId: (placeId: string, title?: string) => Promise<LocationResponse>
  }

  try {
    const location = await getLocationWithCache(
      place_id
        ? { placeId: place_id as string, title: title as string | undefined }
        : { lat: lat as string, lng: lng as string },
      googleLocationService,
      req.scope
    )

    res.json(location)
  } catch (err) {
    const error = err as Error
    res.status(500).json({ error: error.message })
  }
}
