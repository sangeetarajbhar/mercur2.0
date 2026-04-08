export const defaultTierFields = [
  "id",
  "name",
  "promo_id",
  "tier_rules.id",
  "tier_rules.min_purchase_value",
  "tier_rules.currency_code",
  "promotion.id",
  "promotion.code",
  "promotion.status",
]

export const defaultCustomerFields = [
  "id",
  "email",
  "first_name",
  "last_name",
]

export const adminTierQueryConfig = {
  list: {
    defaults: defaultTierFields,
    isList: true,
  },
  retrieve: {
    defaults: defaultTierFields,
    isList: false,
  },
  customers: {
    defaults: defaultCustomerFields,
    isList: true,
  },
}

