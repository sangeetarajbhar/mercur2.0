export const adminPriceListRequestFields = [
  "id",
  "type",
  "data",
  "submitter_id",
  "seller_id",
  "file_name",
  "transaction_id",
  "reviewer_id",
  "reviewer_note",
  "status",
  "created_at",
  "updated_at",
]

export const adminPriceListRequestConfig = {
  list: {
    defaults: adminPriceListRequestFields,
    isList: true,
  },
  retrieve: {
    defaults: adminPriceListRequestFields,
    isList: false,
  },
}
