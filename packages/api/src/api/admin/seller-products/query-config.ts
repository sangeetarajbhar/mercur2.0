export const adminSellerProductsFields = [
  'id',
  'title',
  'subtitle',
  'status',
  'handle',
  'description',
  'collection_id',
  'type_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'metadata',
  'collection.*',
  'type.*',
  'tags.*',
  'images.*',
  'variants.*',
  'variants.prices.*',
  'options.*',
  'options.values.*',
  'categories.*',
  'sales_channels.*',
  'brand.*'
]

export const listSellerProductsQueryConfig = {
  defaults: adminSellerProductsFields,
  isList: true
}

export const retrieveSellerProductQueryConfig = {
  defaults: adminSellerProductsFields,
  isList: false
}
