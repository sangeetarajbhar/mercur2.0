import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { getCartPromise } from '../../delivery-promise/workflows/get-cart-promise'
import { CART_DELIVERY_DETAIL_MODULE } from '../../../modules/cart-delivery-detail'
import CartDeliveryDetailService from '../../../modules/cart-delivery-detail/service'
import { fetchControlSettings } from '../../delivery-promise/steps/fetch-control-settings'
import { combineDateAndTime, parseDateString, validateDateIsTodayOrTomorrow, validateDateTimeIsInFuture } from './helpers/delivery-validation-utils'
import { getTodayIST } from '../../delivery-promise/utils/date-time-utils'

type ShipmentInput = {
  promise_key: string | number
  delivery_type: 'standard' | 'home_trial'
  slot_id?: string | null
}

type DeliveryDetailInput = {
  shipment_type: 'single' | 'multiple'
  delivery_type?: 'standard' | 'home_trial'
  slot_id?: string | null
  shipments?: ShipmentInput[]
}

type UpdateShipmentDeliveryDetailsInput = {
  cart_id: string
  postal_code: string
  cart: any
  delivery_detail: DeliveryDetailInput
}

type SlotOverride = {
  id: string
  zone_id: string
  slot_date: string
  start_time: string
  end_time: string
  cut_off_time?: string | null
  remaining_capacity: number
  is_active: boolean
}

function normalizePromiseKey(key: string | number): string {
  return String(key)
}

export const updateShipmentDeliveryDetailsStep = createStep(
  {
    name: 'update-shipment-delivery-details'
  },
  async (
    input: UpdateShipmentDeliveryDetailsInput,
    { container }
  ): Promise<StepResponse<{ success: boolean }, { success: boolean }>> => {

    console.log('input---', input.cart.items)
    const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    const cartDeliveryDetailService = container.resolve<CartDeliveryDetailService>(CART_DELIVERY_DETAIL_MODULE)
    const now = new Date()

    const deliveryPromiseResult = await getCartPromise({
      scope: container,
      cart: input.cart,
      postal_code: input.postal_code
    })

    const groups = deliveryPromiseResult.deliveryPromiseGroupsData || []
    if (!groups.length) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'No promise groups found for cart')
    }

    const groupByKey = new Map(groups.map((g) => [String(g.promise_key), g]))
    const allCalculatedLineItems = new Set<string>(groups.flatMap((g) => g.line_item_ids || []))

    let shipmentsToPersist: ShipmentInput[] = []

    if (input.delivery_detail.shipment_type === 'single') {
      const sorted = [...groups].sort((a, b) => Number(a.minutes?.total || 0) - Number(b.minutes?.total || 0))
      const largest = sorted[sorted.length - 1]
      shipmentsToPersist = [{
        promise_key: largest.promise_key,
        delivery_type: input.delivery_detail.delivery_type || 'standard',
        slot_id: input.delivery_detail.slot_id ?? null
      }]
    } else {
      shipmentsToPersist = input.delivery_detail.shipments || []
      if (!shipmentsToPersist.length) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, 'At least one shipment is required for multiple shipment_type')
      }
    }

    // Validate promise keys + delivery options + full mapping coverage.
    const mappedLineItems = new Set<string>()
    for (const shipment of shipmentsToPersist) {
      const promiseKey = normalizePromiseKey(shipment.promise_key)
      const group = groupByKey.get(promiseKey)
      if (!group) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `promise not found: ${promiseKey}`)
      }

      const requestedType = shipment.delivery_type
      const matchedOption = (group.delivery_options || []).find((o) => o.key === requestedType)
      if (!matchedOption?.eligible) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `delivery_type '${requestedType}' is not eligible for promise_key '${promiseKey}'`
        )
      }

      for (const li of group.line_item_ids || []) {
        mappedLineItems.add(li)
      }
    }

    for (const li of allCalculatedLineItems) {
      if (!mappedLineItems.has(li)) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `line item '${li}' is not mapped to any promise group`)
      }
    }

    // Soft-delete previous detail rows and remove old line-item mappings.
    const { data: existingDetails } = await query.graph({
      entity: 'cart_delivery_detail',
      filters: { cart_id: input.cart_id, deleted_at: { $eq: null } },
      fields: ['id']
    })
    const existingIds = (existingDetails || []).map((d: { id: string }) => d.id)
    if (existingIds.length) {

      const linksToDismiss = existingIds.map((row) => ({
        [Modules.CART]: { line_item_id: row.line_item_id },
        [CART_DELIVERY_DETAIL_MODULE]: { cart_delivery_detail_id: row.cart_delivery_detail_id },
      }))

      if (linksToDismiss.length) {
        await link.dismiss(linksToDismiss)
        await cartDeliveryDetailService.softDeleteCartDeliveryDetails(existingIds)
      }
      
    }

    // Pre-validate and compute shipment delivery data in parallel (read-only work).
    const computedShipments = await Promise.all(
      shipmentsToPersist.map(async (shipment) => {
        const promiseKey = normalizePromiseKey(shipment.promise_key)
        const group = groupByKey.get(promiseKey)!

        let deliveryDate = now
        let startTime = group.instant_promise?.eta_iso
          ? new Date(group.instant_promise.eta_iso).toTimeString().slice(0, 5)
          : now.toTimeString().slice(0, 5)
        let endTime = startTime
        let slotIdToPersist: string | null = null

        const slotId = typeof shipment.slot_id === 'string' && shipment.slot_id.trim()
          ? shipment.slot_id.trim()
          : null

        if (slotId) {
          const { data: slots } = await query.graph({
            entity: 'slot_override',
            filters: { id: slotId, deleted_at: { $eq: null } },
            fields: ['id', 'zone_id', 'slot_date', 'start_time', 'end_time', 'cut_off_time', 'remaining_capacity', 'is_active']
          })
          const slot = (slots?.[0] || null) as SlotOverride | null
          if (!slot) {
            throw new MedusaError(MedusaError.Types.INVALID_DATA, `Slot with id ${slotId} not found`)
          }
          if (!slot.is_active) {
            throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Selected slot is not active')
          }
          if (slot.remaining_capacity <= 0) {
            throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Selected slot is fully booked. Please select another slot.')
          }

          validateDateIsTodayOrTomorrow(slot.slot_date, 'Slot date')
          validateDateTimeIsInFuture(combineDateAndTime(slot.slot_date, slot.end_time), 'Slot end time')

          const todayStr = getTodayIST(now)
          if (slot.slot_date === todayStr && slot.cut_off_time) {
            const cutoffDateTime = combineDateAndTime(slot.slot_date, slot.cut_off_time)
            if (now >= cutoffDateTime) {
              throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                `Selected delivery slot is past cutoff time (${slot.cut_off_time}). Please select another slot.`
              )
            }
          }

          deliveryDate = parseDateString(slot.slot_date)
          startTime = slot.start_time
          endTime = slot.end_time
          slotIdToPersist = slotId
        } else {
          const instant = group.instant_promise
          if (!instant?.eta_iso || !instant.delivery_date) {
            throw new MedusaError(MedusaError.Types.INVALID_DATA, `No instant promise available for promise_key '${promiseKey}'`)
          }
          const eta = new Date(instant.eta_iso)
          deliveryDate = eta
          startTime = now.toTimeString().slice(0, 5)
          endTime = eta.toTimeString().slice(0, 5)
        }

        return {
          shipment,
          promiseKey,
          group,
          deliveryDate,
          startTime,
          endTime,
          slotIdToPersist
        }
      })
    )

    // Persist sequentially to avoid partial write races and keep ordering deterministic.
    for (const computed of computedShipments) {
      const { shipment, promiseKey, group, deliveryDate, startTime, endTime, slotIdToPersist } = computed

      const created = await cartDeliveryDetailService.createCartDeliveryDetails({
        cart_id: input.cart_id,
        promise_key: Number(promiseKey),
        delivery_type: shipment.delivery_type,
        delivery_date: deliveryDate,
        start_time: startTime,
        end_time: endTime,
        slot_id: slotIdToPersist
      })

      const detailId = Array.isArray(created) ? created[0]?.id : (created as any)?.id
      if (!detailId) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, `Failed to create delivery detail for promise_key '${promiseKey}'`)
      }

      const linksToCreate = (group.line_item_ids || []).map((lineItemId) => ({
        [Modules.CART]: { line_item_id: lineItemId },
        [CART_DELIVERY_DETAIL_MODULE]: { cart_delivery_detail_id: detailId }
      }))

      if (linksToCreate.length) {
        await link.create(linksToCreate)
      }
    }

    return new StepResponse({ success: true })
  }
)

