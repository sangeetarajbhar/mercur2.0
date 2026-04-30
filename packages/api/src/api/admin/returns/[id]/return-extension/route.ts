import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
  type MedusaContainer,
} from '@medusajs/framework'
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from '@medusajs/framework/utils'

import {
  RETURN_EXTENSION_DATE_COLUMN_SET,
  statusToDateColumnName
} from '../../../../../modules/return-extension/constants'
import { RETURN_EXTENSION_MODULE } from '../../../../../modules/return-extension'
import { AdminPostReturnExtensionReqSchemaType } from '../../validators'

async function emitReturnRiderOutForPickupIfNeeded(
  container: MedusaContainer,
  shouldEmit: boolean,
  returnId: string
): Promise<void> {
  if (!shouldEmit) {
    return
  }
  const eventBus = container.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: 'return_rider_out_for_pickup',
    data: { return_id: returnId },
  })
}

/**
 * @oas [post] /admin/returns/{id}/return-extension
 * operationId: "AdminPostReturnExtension"
 * summary: "Upsert return extension status timestamp"
 * description: "Creates or updates return_extension. Sets `status` and a timestamp on the allowed `*_at` column derived from `status` (currently only `out_for_pickup_at` / OUT_FOR_PICKUP)."
 * x-authenticated: true
 */
export async function POST(
  req: AuthenticatedMedusaRequest<AdminPostReturnExtensionReqSchemaType>,
  res: MedusaResponse
) {
  const { id: returnId } = req.params
  const { status, date } = req.validatedBody

  const dateColumn = statusToDateColumnName(status)
  if (!dateColumn || !RETURN_EXTENSION_DATE_COLUMN_SET.has(dateColumn)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Date column for the status is non-existent'
    )
  }

  const at = new Date(date)
  if (Number.isNaN(at.getTime())) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      'Invalid date value'
    )
  }

  const statusValue = status.trim()

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: existingReturns } = await query.graph({
    entity: 'return',
    fields: ['id'],
    filters: { id: returnId }
  })

  if (!existingReturns?.[0]) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Return with id ${returnId} not found`
    )
  }

  const { data: existingExtensions } = await query.graph({
    entity: 'return_extension',
    fields: ['id', 'out_for_pickup_at'],
    filters: {
      return_id: returnId,
      deleted_at: { $eq: null },
    }
  })

  const previousOutForPickupAt = existingExtensions?.[0]?.out_for_pickup_at
  const previousMs = previousOutForPickupAt
    ? new Date(previousOutForPickupAt as string | Date).getTime()
    : null
  const nextMs = at.getTime()
  const shouldEmitRiderOutForPickup =
    dateColumn === 'out_for_pickup_at' &&
    (previousMs == null ||
      Number.isNaN(previousMs) ||
      previousMs !== nextMs)

  const extensionService = req.scope.resolve(RETURN_EXTENSION_MODULE) as any

  const patch = {
    status: statusValue,
    [dateColumn]: at,
  }

  if (existingExtensions?.[0]?.id) {
    const updated = await extensionService.updateReturnExtensions({
      id: existingExtensions[0].id,
      ...patch,
    })

    await emitReturnRiderOutForPickupIfNeeded(
      req.scope,
      shouldEmitRiderOutForPickup,
      returnId
    )

    return res.status(200).json({
      return_id: returnId,
      date_column: dateColumn,
      return_extension: updated
    })
  }

  const created = await extensionService.createReturnExtensions({
    return_id: returnId,
    ...patch,
  })

  await emitReturnRiderOutForPickupIfNeeded(
    req.scope,
    shouldEmitRiderOutForPickup,
    returnId
  )

  return res.status(201).json({
    return_id: returnId,
    date_column: dateColumn,
    return_extension: created
  })
}
