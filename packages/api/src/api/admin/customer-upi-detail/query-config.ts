export const defaultCustomerUpiDetailsFields = [
  "id",
  "verified_by",
  "customer_bank_account_verification_id",
  "upi_id_enc",
  "upi_id_hmac",
  "masked_upi",
  "status",
  "metadata",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]

export const customerUpiDetailQueryConfig = {
  list: {
    defaults: defaultCustomerUpiDetailsFields,
    isList: true,
  },
  retrieve: {
    defaults: defaultCustomerUpiDetailsFields,
    isList: false,
  },
}
