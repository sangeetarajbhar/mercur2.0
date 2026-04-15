import { Modules } from '@medusajs/framework/utils'
import CustomCacheModuleService from '../../modules/cache/service'

export interface LocationResponse {
  title: string
  address_2: string
  formattedAddress: string
  coordinates: { lat: number; lng: number }
  lat: number
  lng: number
  city: string
  province: string
  postal_code: string
  country_code: string
}

export interface GetLocationFromCoordinatesParams {
  lat: string | number
  lng: string | number
}

export interface GetLocationFromPlaceIdParams {
  placeId: string
  title?: string
}

const COORDINATE_DECIMALS = process.env.GEO_CACHE_COORDINATE_DECIMALS ? parseInt(process.env.GEO_CACHE_COORDINATE_DECIMALS) : 4
const CACHE_TTL_SECONDS = process.env.GEO_CACHE_TTL_SECONDS ? parseInt(process.env.GEO_CACHE_TTL_SECONDS) : 90 * 24 * 60 * 60 

const CACHE_KEY_PREFIX = {
  PLACE_ID: 'geocoding:place_id:',
  LAT_LNG: 'geocoding:latlng:',
} as const

function roundCoordinate(coord: string | number, decimals: number = COORDINATE_DECIMALS): string {
  const num = typeof coord === 'string' ? parseFloat(coord) : coord
  if (isNaN(num)) {
    throw new Error(`Invalid coordinate: ${coord}`)
  }
  return num.toFixed(decimals)
}

function getGeocodingCacheKey(
  params:
    | { placeId: string }
    | { lat: string | number; lng: string | number }
): string {
  if ('placeId' in params) {
    return `${CACHE_KEY_PREFIX.PLACE_ID}${params.placeId}`
  }

  const roundedLat = roundCoordinate(params.lat)
  const roundedLng = roundCoordinate(params.lng)
  return `${CACHE_KEY_PREFIX.LAT_LNG}${roundedLat},${roundedLng}`
}

async function getLocationFromCache(
  cacheKey: string,
  container: any
): Promise<LocationResponse | null> {
  try {
    const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
    return await cacheService.get<LocationResponse>(cacheKey)
  } catch (error) {
    console.error(`Error getting location from cache for key ${cacheKey}:`, error)
    return null
  }
}

async function setLocationInCache(
  cacheKey: string,
  location: LocationResponse,
  container: any
): Promise<void> {
  try {
    const cacheService = container.resolve(Modules.CACHE) as CustomCacheModuleService
    await cacheService.set(cacheKey, location, CACHE_TTL_SECONDS)
  } catch (error) {
    console.error(`Error setting location in cache for key ${cacheKey}:`, error)
  }
}

/**
 * Get location with caching support.
 * Handles cache lookup, API call fallback, and cache storage.
 */
export async function getLocationWithCache(
  params:
    | GetLocationFromPlaceIdParams
    | GetLocationFromCoordinatesParams,
  googleLocationService: {
    getAddressFromLatLng: (lat: string, lng: string) => Promise<LocationResponse>
    getAddressFromPlaceId: (placeId: string, title?: string) => Promise<LocationResponse>
  },
  container: any
): Promise<LocationResponse> {
  const cacheKey = 'placeId' in params
    ? getGeocodingCacheKey({ placeId: params.placeId })
    : getGeocodingCacheKey({ lat: params.lat, lng: params.lng })

  const cachedLocation = await getLocationFromCache(cacheKey, container)
  if (cachedLocation) {
    return cachedLocation
  }

  let location: LocationResponse
  if ('placeId' in params) {
    location = await googleLocationService.getAddressFromPlaceId(
      params.placeId,
      params.title
    )
  } else {
    const roundedLat = roundCoordinate(params.lat)
    const roundedLng = roundCoordinate(params.lng)
    location = await googleLocationService.getAddressFromLatLng(roundedLat, roundedLng)
  }

  setLocationInCache(cacheKey, location, container).catch((error) => {
    console.error('Failed to cache location:', error)
  })

  return location
}
