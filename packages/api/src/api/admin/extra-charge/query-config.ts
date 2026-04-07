export const adminExtraChargeFields = [
  "id",
  "name",
  "amount",
  "status",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]

export const adminExtraChargeQueryConfig = {
  list: {
    defaults: adminExtraChargeFields,
    isList: true,
  },
  retrieve: {
    defaults: adminExtraChargeFields,
    isList: false,
  },
}
