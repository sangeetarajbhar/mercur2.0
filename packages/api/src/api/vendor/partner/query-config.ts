export const vendorPartnerFields = ["id", "name", "status"]

export const vendorPartnerQueryConfig = {
  list: { defaults: vendorPartnerFields, isList: true },
  retrieve: { defaults: vendorPartnerFields, isList: false },
}
