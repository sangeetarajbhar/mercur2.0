import { Knex } from 'knex'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { MedusaContainer, container } from '@medusajs/framework'
import { CACHE_ENABLE, CacheTTLMap, QueryGraphCacheKey } from '../../../../shared/utils/redisKey'

export type ZoneData = {
  id: string
  location_id: string
  name?: string
  postcodes: string[]
  is_active: boolean
}

/**
 * Fetches zone information by pincode
 * @param pincode - Pincode to search for
 * @param knex - Knex database connection
 * @returns Zone data or null if not found
 */
export async function fetchZoneByPincode(
  pincode: string,
  knex: Knex
): Promise<ZoneData | null> {
  try {
    // const zones = await knex('zone')
    //   .select('*')
    //   .whereRaw('postcodes::jsonb @> ?', [JSON.stringify([pincode])])
    //   .where('is_active', true)
    //   .whereNull('deleted_at')

    const ttl = CacheTTLMap[QueryGraphCacheKey.FETCH_ZONE_BY_PINCODE]
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: zones } = await query.graph({
        entity: "zone",
        fields: ["*"],
        filters: {
          is_active: true,
          deleted_at: null,
          postcodes: {
            $contains: [pincode], // JSONB @>
          },
        },
      },
      {
        cache: {
          enable: CACHE_ENABLE,
          ttl: ttl,
          key: QueryGraphCacheKey.FETCH_ZONE_BY_PINCODE+`${pincode}`
        }
      }
    )

    const zone = zones?.[0]
    // console.log('zone',zone)
    if (!zone) {
      return null
    }

    return {
      id: zone.id,
      location_id: zone.location_id,
      name: zone.name,
      postcodes: (zone.postcodes as unknown) as string[],
      is_active: zone.is_active
    }
  } catch (error) {
    console.error('Error fetching zone by pincode:', error)
    return null
  }
}
/**
 * Fetches zone information by location_id (cluster_id)
 * @param location_id - Location ID (cluster_id) to search for
 * @param scope - Medusa container
 * @returns Zone ID or null if not found
 */
export async function fetchZoneIdByLocationId(
  location_id: string,
  scope: MedusaContainer
): Promise<string | null> {
  try {
    const query = scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: zones } = await query.graph({
      entity: 'zone',
      fields: ['id', 'location_id'],
      filters: { location_id, is_active: true, deleted_at: { $eq: null } }
    })

    if (zones && zones.length > 0) {
      return zones[0].id
    }

    return null
  } catch (error) {
    console.error('Error fetching zone by location_id:', error)
    return null
  }
}
