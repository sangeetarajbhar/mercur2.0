type ModuleOptions = { apiKey: string }

type GooglePlacePrediction = {
  description: string
  place_id: string
  structured_formatting?: {
    main_text?: string
  }
  terms?: Array<{ value: string }>
}

type AddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

type GeocodingResult = {
  address_components: AddressComponent[]
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types: string[]
}

const GOOGLE_MAPS_API = {
  GEOCODING: 'https://maps.googleapis.com/maps/api/geocode/json',
  PLACES_AUTOCOMPLETE:
    'https://maps.googleapis.com/maps/api/place/autocomplete/json'
} as const
export class GoogleLocationService {
  private apiKey: string

  constructor(_container: Record<string, unknown>, options: ModuleOptions) {
    this.apiKey = options.apiKey
  }

  /**
   * Extract title from geocoding result based on priority:
   * 1. Establishment/Point of Interest name
   * 2. Premise name
   * 3. Street address (street_number + route)
   * 4. Neighborhood
   * 5. Sublocality
   * 6. Locality
   * 7. formatted_address (fallback)
   */
  private extractTitle(result: GeocodingResult): string {
    const components = result?.address_components || []
    const types = result?.types || []

    // 1. Check for establishment/point_of_interest
    if (
      types.includes('establishment') ||
      types.includes('point_of_interest')
    ) {
      const establishment = components.find(
        (c) =>
          c.types.includes('establishment') ||
          c.types.includes('point_of_interest')
      )
      if (establishment) return establishment.long_name
    }

    // 2. Check for premise
    const premise = components.find((c) => c.types.includes('premise'))
    if (premise) return premise.long_name

    // 3. Street address (street_number + route)
    const streetNumber = components.find((c) =>
      c.types.includes('street_number')
    )
    const route = components.find((c) => c.types.includes('route'))
    if (streetNumber && route) {
      return `${streetNumber.long_name}, ${route.long_name}`
    }

    // 4. Neighborhood
    const neighborhood = components.find((c) =>
      c.types.includes('neighborhood')
    )
    if (neighborhood) return neighborhood.long_name

    // 5. Sublocality
    const sublocality = components.find(
      (c) =>
        c.types.includes('sublocality_level_1') ||
        c.types.includes('sublocality_level_2')
    )
    if (sublocality) return sublocality.long_name

    // 6. Locality
    const locality = components.find((c) => c.types.includes('locality'))
    if (locality) return locality.long_name

    // 7. Fallback to formatted_address
    return result?.formatted_address || ''
  }

  async getAddressFromLatLng(lat: string, lng: string) {
    const url = `${GOOGLE_MAPS_API.GEOCODING}?latlng=${lat},${lng}&key=${this.apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      throw new Error(`Google Geocoding API error: ${data.status}`)
    }

    const result = data.results[0]
    if (!result) {
      throw new Error('No results found from geocoding API')
    }

    const components = result.address_components || []

    const getComponent = (type: string, short = false) => {
      const comp = components.find((c) => c.types.includes(type))
      return short ? comp?.short_name || '' : comp?.long_name || ''
    }

    const title = this.extractTitle(result)
    const formattedAddress = result.formatted_address || ''
    const parts = formattedAddress.split(',').map((p) => p.trim())
    const addressParts = parts.slice(0, parts.length - 3)
    const address_2 = addressParts.join(', ')
    const coordinates = result.geometry?.location

    return {
      title,
      address_2,
      formattedAddress,
      coordinates,
      city:
        getComponent('locality') || getComponent('administrative_area_level_2'),
      province: getComponent('administrative_area_level_1'),
      postal_code: getComponent('postal_code'),
      country_code: getComponent('country', true)
    }
  }

  async getAutocomplete(input: string) {
    // Mumbai coordinates for location bias (soft bias - prioritize Mumbai results)
    const MUMBAI_CENTER = { lat: 19.076, lng: 72.8777 }
    const RADIUS = 50000 // meters (~50 km)

    // Build URL with location bias and country restriction
    // locationbias parameter biases results towards Mumbai without excluding others
    const params = new URLSearchParams({
      input: input,
      key: this.apiKey,
      components: `country:in`,
      location: `${MUMBAI_CENTER.lat},${MUMBAI_CENTER.lng}`,
      radius: RADIUS.toString()
    })

    const url = `${GOOGLE_MAPS_API.PLACES_AUTOCOMPLETE}?${params.toString()}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places Autocomplete API error: ${data.status}`)
    }

    const simplifiedPredictions = (data.predictions || []).map(
      (prediction: GooglePlacePrediction) => {
        // Determine title based on priority:
        // 1. structured_formatting.main_text
        // 2. terms[0].value (if terms array exists and has length > 0)
        // 3. description (fallback)
        let title = prediction.description // fallback

        if (prediction.structured_formatting?.main_text) {
          title = prediction.structured_formatting.main_text
        } else if (prediction.terms && prediction.terms.length > 0) {
          title = prediction.terms[0].value
        }

        return {
          description: prediction.description,
          place_id: prediction.place_id,
          title: title
        }
      }
    )

    return {
      predictions: simplifiedPredictions,
      status: data.status
    }
  }

  async getAddressFromPlaceId(placeId: string, providedTitle?: string) {
    const url = `${GOOGLE_MAPS_API.GEOCODING}?place_id=${placeId}&key=${this.apiKey}`

    const response = await fetch(url)
    const data = await response.json()
    if (data.status !== 'OK') {
      throw new Error(`Google Geocoding API error: ${data.status}`)
    }

    const result = data.results[0]
    if (!result) {
      throw new Error('No results found from geocoding API')
    }

    const components = result.address_components || []

    const getComponent = (type: string, short = false) => {
      const comp = components.find((c) => c.types.includes(type))
      return short ? comp?.short_name || '' : comp?.long_name || ''
    }

    // Use provided title if explicitly provided, otherwise extract from result
    const title =
      providedTitle !== undefined ? providedTitle : this.extractTitle(result)
    const formattedAddress = result.formatted_address || ''
    const parts = formattedAddress.split(',').map((p) => p.trim())
    const addressParts = parts.slice(0, parts.length - 3)
    const address_2 = addressParts.join(', ')
    const coordinates = result.geometry?.location

    return {
      title,
      address_2,
      formattedAddress,
      coordinates,
      city:
        getComponent('locality') || getComponent('administrative_area_level_2'),
      province: getComponent('administrative_area_level_1'),
      postal_code: getComponent('postal_code'),
      country_code: getComponent('country', true)
    }
  }
}

export default GoogleLocationService
