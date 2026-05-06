export const defaultPaymentCollectionFields = [
  "id",
  "currency_code",
  "amount",
  "*payment_sessions",
]

export const retrievePaymentCollectionTransformQueryConfig = {
  defaults: defaultPaymentCollectionFields,
  isList: false,
}

export const refreshCartItemsWorkflowFieldsForPaymentCollectionAndSession = [
  'id',
  'total',
  'subtotal',
  'shipping_total',
  'tax_total',
  'discount_total',
  'extra_charge_total',
  'customer_id',
  'shipping_address.*',
  'items.*',
]
