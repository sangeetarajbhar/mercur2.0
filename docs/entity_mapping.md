store [icon: store, color: blue] {
  id string pk
  name string
  default_location_id string
  default_sales_channel_id string
  default_region_id string
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

location [icon: map-pin, color: blue] {
  id string pk
}

sales_channel [icon: radio, color: blue] {
  id string pk
  name string
  description string
  is_disabled boolean
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

region [icon: globe, color: blue] {
  automatic_taxes boolean
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
  metadata Json
  name string
  currency_code string
  id string pk
}

region_country [icon: flag, color: blue] {
  iso_2 string pk
  iso_3 string
  num_code string
  name string
  display_name string
  region_id string
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

payment_provider [icon: credit-card, color: blue] {
  id string pk
  is_enabled boolean
}

region_payment_provider [icon: link, color: blue] {
  region_id string
  payment_provider_id string
}

currency [icon: coins, color: blue] {
  code string pk
  symbol string
  symbol_native string
  name string
  decimal_digits number
  rounding number
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

store_currency [icon: layers, color: blue] {
  id string pk
  store_id string
  currency_code string
  is_default boolean
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

price_preference [icon: sliders, color: blue] {
  is_tax_inclusive boolean
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
  attribute string
  value string
  id string pk
}

tax_provider [icon: percent, color: blue] {
  id string pk
  is_enabled boolean
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

tax_region [icon: map, color: blue] {
  id string pk
  provider_id string
  country_code string
  province_code string
  parent_id string
  metadata Json
  created_at timestamp
  updated_at timestamp
  created_by string
  deleted_at timestamp
}

tax_rate [icon: percent, color: blue] {
  id string pk
  rate number
  code string
  name string
  is_default boolean
  is_combinable boolean
  tax_region_id string
  metadata Json
  created_at timestamp
  updated_at timestamp
  created_by string
  deleted_at timestamp
}

tax_rate_rule [icon: filter, color: blue] {
  id string pk
  tax_rate_id string
  reference_id string
  reference string
  metadata Json
  created_at timestamp
  updated_at timestamp
  created_by string
  deleted_at timestamp
}

return_reason [icon: rotate-ccw, color: blue] {
  id string pk
  value string
  label string
  description string
  metadata Json
  parent_return_reason_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

refund_reason [icon: banknote, color: blue] {
  id string pk
  code string
  label string
  description string
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

store.default_location_id > location.id
store.default_sales_channel_id > sales_channel.id
store.default_region_id > region.id
region.id < region_country.region_id
region.currency_code > currency.code
region.id < region_payment_provider.region_id
region_payment_provider.payment_provider_id > payment_provider.id
store.id < store_currency.store_id
store_currency.currency_code > currency.code
price_preference.value > currency.code
price_preference.value > region.id
tax_region.parent_id > tax_region.id
tax_region.provider_id > tax_provider.id
tax_region.id < tax_rate.tax_region_id
tax_rate.id < tax_rate_rule.tax_rate_id
tax_region.country_code > region_country.iso_2
return_reason.parent_return_reason_id > return_reason.id

// --- Product module (Medusa @medusajs/medusa ~2.13.x product package). ProductImage ORM maps to table "image". ---

product_type [icon: tag, color: blue] {
  id string pk
  value string
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

product_collection [icon: layers, color: blue] {
  id string pk
  title string
  handle string
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

product_category [icon: folder-tree, color: blue] {
  id string pk
  name string
  description string
  handle string
  mpath string
  is_active boolean
  is_internal boolean
  rank number
  metadata Json
  parent_category_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

product_tag [icon: tags, color: blue] {
  id string pk
  value string
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

product [icon: package, color: blue] {
  id string pk
  title string
  handle string
  subtitle string
  description string
  is_giftcard boolean
  status string
  thumbnail string
  weight string
  length string
  height string
  width string
  origin_country string
  hs_code string
  mid_code string
  material string
  discountable boolean
  external_id string
  metadata Json
  type_id string
  collection_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

product_option [icon: list, color: blue] {
  id string pk
  title string
  metadata Json
  product_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

product_option_value [icon: circle-dot, color: blue] {
  id string pk
  value string
  metadata Json
  option_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

product_variant [icon: boxes, color: blue] {
  id string pk
  title string
  sku string
  barcode string
  ean string
  upc string
  allow_backorder boolean
  manage_inventory boolean
  hs_code string
  origin_country string
  mid_code string
  material string
  weight number
  length number
  height number
  width number
  metadata Json
  variant_rank number
  thumbnail string
  product_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

image [icon: image, color: blue] {
  id string pk
  url string
  metadata Json
  rank number
  product_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

product_variant_product_image [icon: link, color: blue] {
  id string pk
  variant_id string
  image_id string
  created_by string
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

product_category_product [icon: link, color: blue] {
  product_id string pk
  product_category_id string pk
}

product_tags [icon: link, color: blue] {
  product_id string pk
  product_tag_id string pk
}

product_variant_option [icon: link, color: blue] {
  variant_id string pk
  option_value_id string pk
}

product.type_id > product_type.id
product.collection_id > product_collection.id
product_category.parent_category_id > product_category.id
product.id < product_option.product_id
product_option.id < product_option_value.option_id
product.id < product_variant.product_id
product.id < image.product_id
product.id < product_category_product.product_id
product_category.id < product_category_product.product_category_id
product.id < product_tags.product_id
product_tag.id < product_tags.product_tag_id
product_variant.id < product_variant_option.variant_id
product_option_value.id < product_variant_option.option_value_id
product_variant.id < product_variant_product_image.variant_id
image.id < product_variant_product_image.image_id

stock_location [icon: warehouse, color: blue] {
  id string pk
  name string
  address_id string
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_location_address [icon: map-pin, color: blue] {
  id string pk
  address_1 string
  address_2 string
  company string
  city string
  country_code string
  phone string
  province string
  postal_code string
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_location_section [icon: layers, color: blue] {
  id string pk
  stock_location_id string
  address_type string
  partner_wh_code string
  lead_time string
  managed_by string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_location_extension [icon: settings, color: blue] {
  id string pk
  location_type string
  address_type string
  latitude number
  longitude number
  partner_id string
  return_location_id string
  status string
  servisibility_status string
  start_time string
  end_time string
  created_by string
  updated_by string
  is_delay boolean
  delay_value string
  delay_message string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_location_contact [icon: user, color: blue] {
  id string pk
  stock_location_section_id string
  first_name string
  last_name string
  email string
  phone_number string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_location_document [icon: file-text, color: blue] {
  id string pk
  stock_location_section_id string
  document_type string
  document_number string
  pdf_url string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

sales_channel_stock_location [icon: link, color: blue] {
  id string pk
  sales_channel_id string
  stock_location_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_location_stock_location_section [icon: link, color: blue] {
  id string pk
  stock_location_id string
  stock_location_section_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_location_stock_location_extension [icon: link, color: blue] {
  id string pk
  stock_location_id string
  stock_location_extension_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_loc_section_contact_link [icon: link, color: blue] {
  id string pk
  stock_location_section_id string
  stock_location_contact_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_loc_section_document_link [icon: link, color: blue] {
  id string pk
  stock_location_section_id string
  stock_location_document_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_location_stock_location_seller_seller [icon: link, color: blue] {
  id string pk
  stock_location_id string
  seller_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_location.address_id > stock_location_address.id
sales_channel.id < sales_channel_stock_location.sales_channel_id
stock_location.id < sales_channel_stock_location.stock_location_id
stock_location.id < stock_location_stock_location_section.stock_location_id
stock_location_section.id < stock_location_stock_location_section.stock_location_section_id
stock_location.id < stock_location_stock_location_extension.stock_location_id
stock_location_extension.id < stock_location_stock_location_extension.stock_location_extension_id
stock_location_section.id < stock_loc_section_contact_link.stock_location_section_id
stock_location_contact.id < stock_loc_section_contact_link.stock_location_contact_id
stock_location_section.id < stock_loc_section_document_link.stock_location_section_id
stock_location_document.id < stock_loc_section_document_link.stock_location_document_id
stock_location_section.id < stock_location_contact.stock_location_section_id
stock_location_section.id < stock_location_document.stock_location_section_id
stock_location.id < stock_location_section.stock_location_id
stock_location.id < stock_location_stock_location_seller_seller.stock_location_id
seller.id < stock_location_stock_location_seller_seller.seller_id

fulfillment_set [icon: package, color: blue] {
  id string pk
  name string
  type string
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

fulfillment_provider [icon: truck, color: blue] {
  id string pk
  is_enabled boolean
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

service_zone [icon: map, color: blue] {
  id string pk
  name string
  metadata Json
  fulfillment_set_id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

geo_zone [icon: globe, color: blue] {
  id string pk
  type string
  country_code string
  province_code string
  city string
  postal_expression string
  service_zone_id string
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

shipping_option [icon: truck, color: blue] {
  id string pk
  name string
  price_type string
  service_zone_id string
  shipping_profile_id string
  provider_id string
  shipping_option_type_id string
  data Json
  metadata Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

inventory_level [icon: boxes, color: blue] {
  id string pk
  inventory_item_id string
  location_id string
  stocked_quantity number
  reserved_quantity number
  incoming_quantity number
  metadata Json
  raw_stocked_quantity Json
  raw_reserved_quantity Json
  raw_incoming_quantity Json
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

location_fulfillment_set [icon: link, color: blue] {
  stock_location_id string pk
  fulfillment_set_id string pk
  id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

location_fulfillment_provider [icon: link, color: blue] {
  stock_location_id string pk
  fulfillment_provider_id string pk
  id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

seller_seller_fulfillment_service_zone [icon: link, color: blue] {
  seller_id string pk
  service_zone_id string pk
  id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

fulfillment_shipping_option_seller_seller [icon: link, color: blue] {
  shipping_option_id string pk
  seller_id string pk
  id string
  created_at timestamp
  updated_at timestamp
  deleted_at timestamp
}

stock_location.id < location_fulfillment_set.stock_location_id
fulfillment_set.id < location_fulfillment_set.fulfillment_set_id
stock_location.id < location_fulfillment_provider.stock_location_id
fulfillment_provider.id < location_fulfillment_provider.fulfillment_provider_id
fulfillment_set.id < service_zone.fulfillment_set_id
service_zone.id < geo_zone.service_zone_id
service_zone.id < shipping_option.service_zone_id
fulfillment_provider.id < shipping_option.provider_id
stock_location.id < inventory_level.location_id
seller.id < seller_seller_fulfillment_service_zone.seller_id
service_zone.id < seller_seller_fulfillment_service_zone.service_zone_id
shipping_option.id < fulfillment_shipping_option_seller_seller.shipping_option_id
seller.id < fulfillment_shipping_option_seller_seller.seller_id
