export const vendorStockLocationFields = [
  'id',
  'metadata',
  'name',
  'address.id',
  'address.address_1',
  'address.address_2',
  'address.city',
  'address.country_code',
  'address.phone',
  'address.province',
  'address.postal_code',
  'address.metadata',
  '*fulfillment_sets',
  '*fulfillment_providers',
  'stock_location_extension.id',
  'stock_location_extension.location_type',
  'stock_location_extension.address_type',
  'stock_location_extension.latitude',
  'stock_location_extension.longitude',
  'stock_location_extension.partner_id',
  'stock_location_extension.return_location_id',
  'stock_location_extension.status',
  'stock_location_extension.servisibility_status',
  'stock_location_extension.start_time',
  'stock_location_extension.end_time',
  'stock_location_section.id',
  'stock_location_section.address_type',
  'stock_location_section.partner_wh_code',
  'stock_location_section.lead_time',
  'stock_location_section.managed_by',
  'stock_location_section.stock_location_documents.id',
  'stock_location_section.stock_location_documents.stock_location_section_id',
  'stock_location_section.stock_location_documents.document_type',
  'stock_location_section.stock_location_documents.document_number',
  'stock_location_section.stock_location_documents.pdf_url',
  'stock_location_section.stock_location_contact.id',
  'stock_location_section.stock_location_contact.stock_location_section_id',
  'stock_location_section.stock_location_contact.first_name',
  'stock_location_section.stock_location_contact.last_name',
  'stock_location_section.stock_location_contact.email',
  'stock_location_section.stock_location_contact.phone_number',
]

export const vendorStockLocationQueryConfig = {
  list: {
    defaults: vendorStockLocationFields,
    isList: true
  },
  retrieve: {
    defaults: vendorStockLocationFields,
    isList: false
  }
}
