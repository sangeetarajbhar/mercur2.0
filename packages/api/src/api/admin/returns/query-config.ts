export const adminReturnFields = [
  'id',
  'order_id',
  'status',
  'refund_amount',
  'location_id',
  'no_notification',
  'internal_note',
  'created_at',
  'updated_at',
  'canceled_at',
  'requested_at',
  'received_at',
  'items.*',
  'order.*',
]

export const adminReturnQueryConfig = {
  list: {
    defaults: adminReturnFields,
    isList: true
  },
  retrieve: {
    defaults: adminReturnFields,
    isList: false
  }
}

