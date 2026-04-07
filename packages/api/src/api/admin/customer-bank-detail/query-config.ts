export const defaultCustomerBankDetailsFields = [
  "id",
  "verified_by",
  "customer_bank_account_verification_id",
  "account_number_enc",
  "account_number_hmac",
  "account_holder_enc",
  "ifsc_code",
  "masked_account",
  "masked_holder",
  "bank_name",
  "status",
  "metadata",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]

export const customerBankDetailQueryConfig = {
  list: {
    defaults: defaultCustomerBankDetailsFields,
    isList: true,
  },
  retrieve: {
    defaults: defaultCustomerBankDetailsFields,
    isList: false,
  },
}
