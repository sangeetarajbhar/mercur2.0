import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { SLOT_OVERRIDES_MODULE } from '../../../modules/slot-overrides'
import SlotOverrideModuleService from '../../../modules/slot-overrides/service'
import { getTomorrowIST } from './date-time-utils'

export const ZONE_NOT_FOUND_ERROR = 'Zone not found or not active'
export const MAX_ZONE_IDS = 10

export class ZoneNotFoundError extends Error {
  constructor(zoneIds: string[]) {
    super(`${ZONE_NOT_FOUND_ERROR}: ${zoneIds.join(', ')}`)
    this.name = 'ZoneNotFoundError'
  }
}

export interface GenerateTomorrowSlotOverridesResult {
  totalCreated: number
  totalSkipped: number
  totalErrors: number
}

export interface GenerateTomorrowSlotOverridesOptions {
  /** When provided, generate only for these zones (max 10). Omit to generate for all active zones. */
  zoneIds?: string[]
  createdBy?: string
  updatedBy?: string
}

/** True if the error is a duplicate key / unique constraint violation (count as Skipped, not Error). */
function isDuplicateKeyError(error: unknown): boolean {
  if (!error) return false
  const code =
    (error as any)?.code ??
    (error as any)?.cause?.code ??
    (error as any)?.original?.code ??
    (error as any)?.parent?.code
  if (code === '23505') return true
  const msg =
    typeof (error as any)?.message === 'string'
      ? (error as any).message
      : String(error) + String((error as any)?.cause?.message ?? '') + String((error as any)?.original?.message ?? '')
  const lower = msg.toLowerCase()
  return (
    lower.includes('uq_slot_override_zone_date_time') ||
    lower.includes('duplicate key') ||
    lower.includes('unique constraint') ||
    lower.includes('23505')
  )
}

/**
 * Generate slot overrides for tomorrow (IST).
 * When zoneIds is provided (array, max 10), generates only for those zones; otherwise for all active zones.
 * @throws ZoneNotFoundError when zoneIds is provided but any zone does not exist or is not active
 */
export async function generateTomorrowSlotOverrides(
  container: MedusaContainer,
  options?: GenerateTomorrowSlotOverridesOptions
): Promise<GenerateTomorrowSlotOverridesResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const slotOverrideService = container.resolve<SlotOverrideModuleService>(SLOT_OVERRIDES_MODULE)

  const now = new Date()
  const tomorrowStr = getTomorrowIST(now)
  const createdBy = options?.createdBy ?? ''
  const updatedBy = options?.updatedBy ?? ''

  if (options?.zoneIds && options.zoneIds.length > 0) {
    return runForZoneIds(query, slotOverrideService, options.zoneIds, tomorrowStr, createdBy, updatedBy)
  }

  return runForAllZones(query, logger, slotOverrideService, tomorrowStr, createdBy, updatedBy)
}

type ZoneBatchLogger = { info: (msg: string) => void; error: (msg: string, err?: any) => void } | undefined

/**
 * Fetch slot definitions and existing overrides for zoneIds, then create tomorrow's overrides.
 * Shared by runForZoneIds and runForAllZones.
 */
async function processZonesBatch(
  query: any,
  slotOverrideService: SlotOverrideModuleService,
  zoneIds: string[],
  tomorrowStr: string,
  createdBy: string,
  updatedBy: string,
  logger?: ZoneBatchLogger
): Promise<GenerateTomorrowSlotOverridesResult> {
  const { data: allSlotDefinitions } = await query.graph({
    entity: 'slot_definition',
    fields: ['*'],
    filters: {
      zone_id: zoneIds,
      is_active: true,
      deleted_at: null
    }
  })

  const { data: allExistingOverrides } = await query.graph({
    entity: 'slot_override',
    fields: ['zone_id', 'slot_key'],
    filters: {
      zone_id: zoneIds,
      slot_date: tomorrowStr,
      deleted_at: null
    }
  })

  const slotDefinitionsByZone = new Map<string, any[]>()
  const existingOverridesByZone = new Map<string, Set<string>>()

  if (allSlotDefinitions) {
    for (const def of allSlotDefinitions) {
      const zid = def.zone_id as string
      if (!slotDefinitionsByZone.has(zid)) slotDefinitionsByZone.set(zid, [])
      slotDefinitionsByZone.get(zid)!.push(def)
    }
  }

  if (allExistingOverrides) {
    for (const override of allExistingOverrides) {
      const zid = override.zone_id as string
      const slotKey = override.slot_key as string
      if (!existingOverridesByZone.has(zid)) existingOverridesByZone.set(zid, new Set())
      if (slotKey) existingOverridesByZone.get(zid)!.add(slotKey)
    }
  }

  let totalCreated = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const zoneId of zoneIds) {
    const slotDefinitions = slotDefinitionsByZone.get(zoneId) || []

    if (slotDefinitions.length === 0) continue

    const existingOverrides = existingOverridesByZone.get(zoneId)
    if (existingOverrides && existingOverrides.size > 0) {
      totalSkipped += slotDefinitions.length
      continue
    }

    const bulkCreateData = slotDefinitions.map((def: any) => ({
      zone_id: zoneId,
      slot_date: tomorrowStr,
      slot_key: def.slot_key,
      start_time: def.start_time,
      end_time: def.end_time,
      cut_off_time: def.cut_off_time,
      total_capacity: def.default_capacity,
      remaining_capacity: def.default_capacity,
      is_active: true,
      created_by: createdBy,
      updated_by: updatedBy
    }))

    try {
      const createdOverrides = await slotOverrideService.createSlotOverrides(bulkCreateData)
      const createdCount = Array.isArray(createdOverrides) ? createdOverrides.length : 1
      totalCreated += createdCount
      logger?.info(`[SLOT_OVERRIDES_CRON] Created ${createdCount} slot overrides for zone ${zoneId} (${tomorrowStr})`)
    } catch (error: any) {
      if (isDuplicateKeyError(error)) {
        totalSkipped += bulkCreateData.length
      } else {
        logger?.error(`[SLOT_OVERRIDES_CRON] Error creating slot overrides for zone ${zoneId}:`, error)
        totalErrors += bulkCreateData.length
      }
    }
  }

  return { totalCreated, totalSkipped, totalErrors }
}

async function runForZoneIds(
  query: any,
  slotOverrideService: SlotOverrideModuleService,
  requestedZoneIds: string[],
  tomorrowStr: string,
  createdBy: string,
  updatedBy: string
): Promise<GenerateTomorrowSlotOverridesResult> {
  const { data: zones } = await query.graph({
    entity: 'zone',
    fields: ['id', 'location_id', 'is_active'],
    filters: {
      id: requestedZoneIds,
      is_active: true,
      deleted_at: null
    }
  })

  const foundIds = new Set((zones || []).map((z: any) => z.id as string))
  const missingIds = requestedZoneIds.filter((id) => !foundIds.has(id))
  if (missingIds.length > 0) {
    throw new ZoneNotFoundError(missingIds)
  }

  return processZonesBatch(
    query,
    slotOverrideService,
    requestedZoneIds,
    tomorrowStr,
    createdBy,
    updatedBy
  )
}

async function runForAllZones(
  query: any,
  logger: { info: (msg: string) => void; error: (msg: string, err?: any) => void },
  slotOverrideService: SlotOverrideModuleService,
  tomorrowStr: string,
  createdBy: string,
  updatedBy: string
): Promise<GenerateTomorrowSlotOverridesResult> {
  const BATCH_SIZE = 10
  let totalCreated = 0
  let totalSkipped = 0
  let totalErrors = 0
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data: zones, metadata } = await query.graph({
      entity: 'zone',
      fields: ['id', 'location_id', 'is_active'],
      filters: {
        is_active: true,
        deleted_at: null
      },
      pagination: {
        skip: offset,
        take: BATCH_SIZE
      }
    })

    if (!zones || zones.length === 0) {
      hasMore = false
      if (offset === 0) {
        logger.info('[SLOT_OVERRIDES_CRON] No active zones found')
      }
      break
    }

    const totalCount = metadata?.count
    logger.info(
      `[SLOT_OVERRIDES_CRON] Processing batch: ${offset + 1}-${offset + zones.length} zones${totalCount ? ` (total: ${totalCount})` : ''}`
    )

    const zoneIds = zones.map((zone: any) => zone.id as string).filter(Boolean)

    if (zoneIds.length === 0) {
      offset += zones.length
      hasMore = zones.length === BATCH_SIZE
      continue
    }

    const result = await processZonesBatch(
      query,
      slotOverrideService,
      zoneIds,
      tomorrowStr,
      createdBy,
      updatedBy,
      logger
    )
    totalCreated += result.totalCreated
    totalSkipped += result.totalSkipped
    totalErrors += result.totalErrors

    offset += zones.length
    if (metadata?.count) {
      hasMore = offset < metadata.count
    } else {
      hasMore = zones.length === BATCH_SIZE
    }

    if (hasMore) {
      await new Promise((resolve) => setImmediate(resolve))
    }
  }

  return { totalCreated, totalSkipped, totalErrors }
}
