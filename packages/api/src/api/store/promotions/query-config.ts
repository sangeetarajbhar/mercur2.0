
export const defaultStorePromotionFields = [
  "id",
  "code",
  "is_automatic",
  "is_tax_inclusive",
  "type",
  "status",
  "created_at",
  "updated_at",
  "deleted_at",
  "campaign_id",
  "campaign.*",
  "campaign.budget.*", // Include campaign budget for validation
  "application_method.*",
  // Removed target_rules from response
  // "application_method.target_rules.*",
  // "application_method.target_rules.values.*",
  // "rules.*",
  // "rules.values.*"
]

export const promotionFieldsWithExtension = [
  ...defaultStorePromotionFields,
  "promotion_extension.id",
  "promotion_extension.cart_sub_total",
  "promotion_extension.promo_code_upper_limit",
  "promotion_extension.first_customer",
  "promotion_extension.for_seller",
  "promotion_extension.is_hidden",
  "promotion_extension.applicable_on"
]

export const storePromotionQueryConfig = {
  list: {
    defaults: defaultStorePromotionFields,
    isList: true,
  },
  retrieve: {
    defaults: defaultStorePromotionFields,
    isList: false,
  },
}


