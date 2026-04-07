import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { lat, lng, place_id, title } = req.query
  if ((!lat || !lng) && !place_id) {
    return res.status(400).json({ error: "Must provide either (lat and lng) or place_id" })
  }

  const googleLocationService = req.scope.resolve("google_location") as {
    getAddressFromLatLng: (lat: string, lng: string) => Promise<any>
    getAddressFromPlaceId: (placeId: string, title?: string) => Promise<any>
  }

  const location = place_id
    ? await googleLocationService.getAddressFromPlaceId(place_id as string, title as string | undefined)
    : await googleLocationService.getAddressFromLatLng(lat as string, lng as string)

  res.json(location)
}
