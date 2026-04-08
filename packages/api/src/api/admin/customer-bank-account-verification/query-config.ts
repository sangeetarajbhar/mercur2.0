export const defaultCustomerBankAccountVerificationFields = [
  "id",
  "customer_refund_method_id",
  "fav_id",
  "customer_id",
  "reference_id",
  "utr",
  "fund_account_id",
  "contact_id",
  "registered_name",
  "bank_account_status",
  "status",
  "failure_reason",
  "metadata",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
]

export const customerBankAccountVerificationQueryConfig = {
  list: {
    defaults: defaultCustomerBankAccountVerificationFields,
    isList: true,
  },
  retrieve: {
    defaults: defaultCustomerBankAccountVerificationFields,
    isList: false,
  },
}
