type ModuleOptions = { apiKey: string }

export class GoogleLocationService {
  private apiKey: string

  constructor(_container: Record<string, unknown>, options: ModuleOptions) {
    this.apiKey = options.apiKey
  }

  async getAddressFromLatLng(lat: string, lng: string) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`
    const response = await fetch(url)
    const data = await response.json()
    if (data.status !== "OK") {
      throw new Error(`Google Geocoding API error: ${data.status}`)
    }
    const result = data.results?.[0]
    return {
      title: result?.formatted_address || "",
      formattedAddress: result?.formatted_address || "",
      coordinates: result?.geometry?.location,
    }
  }

  async getAutocomplete(input: string) {
    const params = new URLSearchParams({
      input,
      key: this.apiKey,
      components: "country:in",
    })
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
    const response = await fetch(url)
    const data = await response.json()
    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(`Google Places Autocomplete API error: ${data.status}`)
    }
    return {
      predictions: (data.predictions || []).map((p: any) => ({
        description: p.description,
        place_id: p.place_id,
        title: p.structured_formatting?.main_text || p.description,
      })),
      status: data.status,
    }
  }

  async getAddressFromPlaceId(placeId: string, providedTitle?: string) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${this.apiKey}`
    const response = await fetch(url)
    const data = await response.json()
    if (data.status !== "OK") {
      throw new Error(`Google Geocoding API error: ${data.status}`)
    }
    const result = data.results?.[0]
    return {
      title: providedTitle || result?.formatted_address || "",
      formattedAddress: result?.formatted_address || "",
      coordinates: result?.geometry?.location,
    }
  }
}

export default GoogleLocationService
