import "@medusajs/framework/types"
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: Date | string; output: Date | string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type CommissionRateTypeEnum =
  | 'fixed'
  | 'percentage';

export type CommissionRateTargetEnum =
  | 'item'
  | 'shipping';

export type CommissionRate = {
  __typename?: 'CommissionRate';
  id: Scalars['ID']['output'];
  is_enabled: Scalars['Boolean']['output'];
  priority: Scalars['Int']['output'];
  currency_code: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  code: Scalars['String']['output'];
  type: CommissionRateTypeEnum;
  target: CommissionRateTargetEnum;
  value: Scalars['Float']['output'];
  min_amount: Maybe<Scalars['Float']['output']>;
  include_tax: Scalars['Boolean']['output'];
  rules: Array<Maybe<CommissionRule>>;
  raw_value: Scalars['JSON']['output'];
  raw_min_amount: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CommissionRule = {
  __typename?: 'CommissionRule';
  id: Scalars['ID']['output'];
  reference: Scalars['String']['output'];
  reference_id: Scalars['String']['output'];
  commission_rate_id: Scalars['String']['output'];
  commission_rate: CommissionRate;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CommissionLine = {
  __typename?: 'CommissionLine';
  id: Scalars['ID']['output'];
  item_id: Scalars['String']['output'];
  commission_rate_id: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  rate: Scalars['Float']['output'];
  amount: Scalars['Float']['output'];
  description: Maybe<Scalars['String']['output']>;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Onboarding = {
  __typename?: 'Onboarding';
  id: Scalars['ID']['output'];
  data: Maybe<Scalars['JSON']['output']>;
  context: Maybe<Scalars['JSON']['output']>;
  account_id: Scalars['String']['output'];
  account: PayoutAccount;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PayoutStatusEnum =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'canceled';

export type Payout = {
  __typename?: 'Payout';
  id: Scalars['ID']['output'];
  display_id: Scalars['String']['output'];
  currency_code: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  data: Maybe<Scalars['JSON']['output']>;
  account_id: Scalars['String']['output'];
  account: PayoutAccount;
  status: PayoutStatusEnum;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  order_link: Maybe<LinkOrderOrderPayoutPayout>;
  order: Maybe<Order>;
  seller_link: Maybe<LinkPayoutPayoutSellerSeller>;
  seller: Maybe<Seller>;
};

export type PayoutAccountStatusEnum =
  | 'pending'
  | 'active'
  | 'restricted'
  | 'rejected';

export type PayoutAccount = {
  __typename?: 'PayoutAccount';
  id: Scalars['ID']['output'];
  status: PayoutAccountStatusEnum;
  data: Scalars['JSON']['output'];
  context: Maybe<Scalars['JSON']['output']>;
  onboarding: Maybe<Onboarding>;
  payouts: Array<Maybe<Payout>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  seller_link: Maybe<LinkSellerSellerPayoutPayoutAccount>;
  seller: Maybe<Seller>;
};

export type OrderGroup = {
  __typename?: 'OrderGroup';
  id: Scalars['ID']['output'];
  display_id: Scalars['String']['output'];
  seller_count: Scalars['Int']['output'];
  customer_id: Maybe<Scalars['String']['output']>;
  total: Scalars['Float']['output'];
  cart_id: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  cart: Maybe<Cart>;
  order_link: Maybe<Array<Maybe<LinkOrderGroupOrder>>>;
  orders: Maybe<Array<Maybe<Order>>>;
};

export type SellerStatusEnum =
  | 'pending'
  | 'active'
  | 'suspended';

export type Seller = {
  __typename?: 'Seller';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  handle: Scalars['String']['output'];
  email: Scalars['String']['output'];
  phone: Maybe<Scalars['String']['output']>;
  logo: Maybe<Scalars['String']['output']>;
  cover_image: Maybe<Scalars['String']['output']>;
  address_1: Maybe<Scalars['String']['output']>;
  address_2: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  country_code: Maybe<Scalars['String']['output']>;
  province: Maybe<Scalars['String']['output']>;
  postal_code: Maybe<Scalars['String']['output']>;
  status: SellerStatusEnum;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  brand_link: Maybe<Array<Maybe<LinkSellerSellerBrandBrand>>>;
  brands: Maybe<Array<Maybe<Brand>>>;
  campaign_link: Maybe<Array<Maybe<LinkPromotionCampaignSellerSeller>>>;
  campaigns: Maybe<Array<Maybe<Campaign>>>;
  fulfillment_set_link: Maybe<Array<Maybe<LinkSellerSellerFulfillmentFulfillmentSet>>>;
  fulfillment_sets: Maybe<Array<Maybe<FulfillmentSet>>>;
  inventory_item_link: Maybe<Array<Maybe<LinkInventoryInventoryItemSellerSeller>>>;
  inventory_items: Maybe<Array<Maybe<InventoryItem>>>;
  order_link: Maybe<Array<Maybe<LinkOrderOrderSellerSeller>>>;
  orders: Maybe<Array<Maybe<Order>>>;
  payout_link: Maybe<Array<Maybe<LinkPayoutPayoutSellerSeller>>>;
  payouts: Maybe<Array<Maybe<Payout>>>;
  price_list_link: Maybe<Array<Maybe<LinkPricingPriceListSellerSeller>>>;
  price_lists: Maybe<Array<Maybe<PriceList>>>;
  product_link: Maybe<Array<Maybe<LinkProductProductSellerSeller>>>;
  products: Maybe<Array<Maybe<Product>>>;
  promotion_link: Maybe<Array<Maybe<LinkPromotionPromotionSellerSeller>>>;
  promotions: Maybe<Array<Maybe<Promotion>>>;
  customer_link: Maybe<Array<Maybe<LinkSellerSellerCustomerCustomer>>>;
  customers: Maybe<Array<Maybe<Customer>>>;
  payout_account_link: Maybe<LinkSellerSellerPayoutPayoutAccount>;
  payout_account: Maybe<PayoutAccount>;
  service_zone_link: Maybe<Array<Maybe<LinkSellerSellerFulfillmentServiceZone>>>;
  service_zones: Maybe<Array<Maybe<ServiceZone>>>;
  shipping_option_link: Maybe<Array<Maybe<LinkFulfillmentShippingOptionSellerSeller>>>;
  shipping_options: Maybe<Array<Maybe<ShippingOption>>>;
  shipping_profile_link: Maybe<Array<Maybe<LinkFulfillmentShippingProfileSellerSeller>>>;
  shipping_profiles: Maybe<Array<Maybe<ShippingProfile>>>;
  stock_location_link: Maybe<Array<Maybe<LinkStockLocationStockLocationSellerSeller>>>;
  stock_locations: Maybe<Array<Maybe<StockLocation>>>;
};

export type MoengageAlert = {
  __typename?: 'MoengageAlert';
  id: Scalars['ID']['output'];
  alert_id: Scalars['String']['output'];
  alert_name: Scalars['String']['output'];
  is_sms: Scalars['Boolean']['output'];
  sms_attributes: Maybe<Scalars['String']['output']>;
  is_whatsapp: Scalars['Boolean']['output'];
  whatsapp_attributes: Maybe<Scalars['String']['output']>;
  is_email: Scalars['Boolean']['output'];
  email_attributes: Maybe<Scalars['String']['output']>;
  is_push: Scalars['Boolean']['output'];
  push_attributes: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Zone = {
  __typename?: 'Zone';
  id: Scalars['ID']['output'];
  location_id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  postcodes: Scalars['JSON']['output'];
  is_active: Scalars['Boolean']['output'];
  start_time: Maybe<Scalars['String']['output']>;
  end_time: Maybe<Scalars['String']['output']>;
  metadata: Scalars['JSON']['output'];
  created_by: Maybe<Scalars['String']['output']>;
  updated_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type InstantPromise = {
  __typename?: 'InstantPromise';
  id: Scalars['ID']['output'];
  zone_id: Scalars['String']['output'];
  promise_text: Scalars['String']['output'];
  promise_minutes: Scalars['Int']['output'];
  pickup_lead_minutes: Scalars['Int']['output'];
  return_lead_minutes: Scalars['Int']['output'];
  is_active: Scalars['Boolean']['output'];
  metadata: Scalars['JSON']['output'];
  created_by: Maybe<Scalars['String']['output']>;
  updated_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type SlotDefinition = {
  __typename?: 'SlotDefinition';
  id: Scalars['ID']['output'];
  zone_id: Scalars['String']['output'];
  slot_key: Scalars['String']['output'];
  start_time: Scalars['String']['output'];
  end_time: Scalars['String']['output'];
  default_capacity: Scalars['Int']['output'];
  is_active: Scalars['Boolean']['output'];
  cut_off_time: Scalars['String']['output'];
  metadata: Scalars['JSON']['output'];
  created_by: Maybe<Scalars['String']['output']>;
  updated_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type SlotOverride = {
  __typename?: 'SlotOverride';
  id: Scalars['ID']['output'];
  zone_id: Scalars['String']['output'];
  slot_date: Scalars['String']['output'];
  slot_key: Maybe<Scalars['String']['output']>;
  start_time: Scalars['String']['output'];
  end_time: Scalars['String']['output'];
  cut_off_time: Maybe<Scalars['String']['output']>;
  total_capacity: Scalars['Int']['output'];
  remaining_capacity: Scalars['Int']['output'];
  is_active: Scalars['Boolean']['output'];
  created_by: Maybe<Scalars['String']['output']>;
  updated_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type StockLocationExtension = {
  __typename?: 'StockLocationExtension';
  id: Scalars['ID']['output'];
  location_type: Scalars['String']['output'];
  address_type: Scalars['String']['output'];
  latitude: Maybe<Scalars['Float']['output']>;
  longitude: Maybe<Scalars['Float']['output']>;
  partner_id: Scalars['String']['output'];
  return_location_id: Scalars['String']['output'];
  status: Scalars['String']['output'];
  servisibility_status: Scalars['String']['output'];
  start_time: Scalars['String']['output'];
  end_time: Scalars['String']['output'];
  is_delay: Scalars['Boolean']['output'];
  delay_value: Maybe<Scalars['String']['output']>;
  delay_message: Maybe<Scalars['String']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  updated_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  stock_location_link: Maybe<LinkStockLocationStockLocationExtension>;
  stock_location: Maybe<StockLocation>;
};

export type ControlScopeEnum =
  | 'zone'
  | 'darkstore';

export type Control = {
  __typename?: 'Control';
  id: Scalars['ID']['output'];
  scope: ControlScopeEnum;
  scope_id: Scalars['String']['output'];
  is_instant_enabled: Scalars['Boolean']['output'];
  is_slotted_enabled: Scalars['Boolean']['output'];
  delay_minutes: Scalars['Int']['output'];
  delay_message: Maybe<Scalars['String']['output']>;
  message_icon: Maybe<Scalars['String']['output']>;
  reason: Maybe<Scalars['JSON']['output']>;
  is_active: Scalars['Boolean']['output'];
  created_by: Maybe<Scalars['String']['output']>;
  updated_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Brand = {
  __typename?: 'Brand';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  handle: Scalars['String']['output'];
  is_active: Scalars['Boolean']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  product_link: Maybe<Array<Maybe<LinkProductProductBrandBrand>>>;
  products: Maybe<Array<Maybe<Product>>>;
  seller_link: Maybe<Array<Maybe<LinkSellerSellerBrandBrand>>>;
  sellers: Maybe<Array<Maybe<Seller>>>;
};

export type AttributeUiComponentEnum =
  | 'select'
  | 'multivalue'
  | 'unit'
  | 'toggle'
  | 'text_area'
  | 'color_picker';

export type Attribute = {
  __typename?: 'Attribute';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  is_filterable: Scalars['Boolean']['output'];
  is_required: Scalars['Boolean']['output'];
  handle: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  ui_component: AttributeUiComponentEnum;
  values: Array<Maybe<AttributeValue>>;
  possible_values: Array<Maybe<AttributePossibleValue>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  product_category_link: Maybe<Array<Maybe<LinkProductProductCategoryAttributeAttribute>>>;
  product_categories: Maybe<Array<Maybe<ProductCategory>>>;
};

export type AttributeValue = {
  __typename?: 'AttributeValue';
  id: Scalars['ID']['output'];
  value: Scalars['String']['output'];
  rank: Scalars['Int']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  attribute_id: Scalars['String']['output'];
  attribute: Attribute;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  product_link: Maybe<Array<Maybe<LinkProductProductAttributeAttributeValue>>>;
  products: Maybe<Array<Maybe<Product>>>;
};

export type AttributePossibleValue = {
  __typename?: 'AttributePossibleValue';
  id: Scalars['ID']['output'];
  value: Scalars['String']['output'];
  rank: Scalars['Int']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  attribute_id: Scalars['String']['output'];
  attribute: Attribute;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type SystemConfig = {
  __typename?: 'SystemConfig';
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerBankAccountVerificationStatusEnum =
  | 'created'
  | 'completed'
  | 'failed';

export type CustomerBankAccountVerification = {
  __typename?: 'CustomerBankAccountVerification';
  id: Scalars['ID']['output'];
  customer_refund_method_id: Maybe<Scalars['String']['output']>;
  customer_id: Maybe<Scalars['String']['output']>;
  gateway_id: Maybe<Scalars['String']['output']>;
  reference_id: Maybe<Scalars['String']['output']>;
  status: CustomerBankAccountVerificationStatusEnum;
  bank_account_status: Maybe<Scalars['String']['output']>;
  utr: Maybe<Scalars['String']['output']>;
  fav_id: Maybe<Scalars['String']['output']>;
  fund_account_id: Maybe<Scalars['String']['output']>;
  contact_id: Maybe<Scalars['String']['output']>;
  registered_name: Maybe<Scalars['String']['output']>;
  failure_reason: Maybe<Scalars['String']['output']>;
  raw_gateway_response_enc: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  updated_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerBankDetail = {
  __typename?: 'CustomerBankDetail';
  id: Scalars['ID']['output'];
  verified_by: Scalars['String']['output'];
  customer_bank_account_verification_id: Maybe<Scalars['String']['output']>;
  account_number_enc: Scalars['String']['output'];
  account_number_hmac: Scalars['String']['output'];
  account_holder_enc: Scalars['String']['output'];
  ifsc_code: Scalars['String']['output'];
  masked_account: Scalars['String']['output'];
  masked_holder: Scalars['String']['output'];
  bank_name: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Scalars['String']['output'];
  updated_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  customer_link: Maybe<Array<Maybe<LinkCustomerCustomerCustomerBankDetailCustomerBankDetail>>>;
  customers: Maybe<Array<Maybe<Customer>>>;
};

export type CustomerUpiDetail = {
  __typename?: 'CustomerUpiDetail';
  id: Scalars['ID']['output'];
  verified_by: Scalars['String']['output'];
  customer_bank_account_verification_id: Maybe<Scalars['String']['output']>;
  upi_id_enc: Scalars['String']['output'];
  upi_id_hmac: Scalars['String']['output'];
  masked_upi: Scalars['String']['output'];
  status: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Scalars['String']['output'];
  updated_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  customer_link: Maybe<Array<Maybe<LinkCustomerCustomerCustomerUpiDetailCustomerUpiDetail>>>;
  customers: Maybe<Array<Maybe<Customer>>>;
};

export type ExtraChargeStatusEnum =
  | 'active'
  | 'inactive';

export type ExtraCharge = {
  __typename?: 'ExtraCharge';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  type: Maybe<Scalars['String']['output']>;
  status: ExtraChargeStatusEnum;
  created_by: Scalars['String']['output'];
  updated_by: Scalars['String']['output'];
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ExtraChargeRuleOperatorEnum =
  | 'eq'
  | 'in'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte';

export type ExtraChargeRuleStatusEnum =
  | 'active'
  | 'inactive';

export type ExtraChargeRule = {
  __typename?: 'ExtraChargeRule';
  id: Scalars['ID']['output'];
  extra_charge_id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  attribute: Scalars['String']['output'];
  operator: ExtraChargeRuleOperatorEnum;
  values: Array<Maybe<Scalars['String']['output']>>;
  min_cart_total: Maybe<Scalars['Float']['output']>;
  max_cart_total: Maybe<Scalars['Float']['output']>;
  min_quantity: Maybe<Scalars['Int']['output']>;
  max_quantity: Maybe<Scalars['Int']['output']>;
  priority: Scalars['Int']['output'];
  status: ExtraChargeRuleStatusEnum;
  starts_at: Maybe<Scalars['DateTime']['output']>;
  ends_at: Maybe<Scalars['DateTime']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Scalars['String']['output'];
  updated_by: Scalars['String']['output'];
  raw_min_cart_total: Maybe<Scalars['JSON']['output']>;
  raw_max_cart_total: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CartOrderExtraCharge = {
  __typename?: 'CartOrderExtraCharge';
  id: Scalars['ID']['output'];
  extra_charge_id: Scalars['String']['output'];
  extra_charge_rule_id: Maybe<Scalars['String']['output']>;
  cart_id: Scalars['String']['output'];
  order_set_id: Maybe<Scalars['String']['output']>;
  customer_id: Maybe<Scalars['String']['output']>;
  name: Maybe<Scalars['String']['output']>;
  original_amount: Scalars['Float']['output'];
  fee_amount: Scalars['Float']['output'];
  tax_total: Scalars['Float']['output'];
  shipping_total: Scalars['Float']['output'];
  discount_total: Scalars['Float']['output'];
  total_amount: Scalars['Float']['output'];
  description: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  status: Scalars['Int']['output'];
  raw_original_amount: Scalars['JSON']['output'];
  raw_fee_amount: Scalars['JSON']['output'];
  raw_tax_total: Scalars['JSON']['output'];
  raw_shipping_total: Scalars['JSON']['output'];
  raw_discount_total: Scalars['JSON']['output'];
  raw_total_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerPaymentPreferences = {
  __typename?: 'CustomerPaymentPreferences';
  id: Scalars['ID']['output'];
  customer_id: Scalars['String']['output'];
  type: Scalars['String']['output'];
  type_id: Scalars['String']['output'];
  status: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  updated_by: Maybe<Scalars['String']['output']>;
  deleted_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerRefundMethodTypeEnum =
  | 'bank'
  | 'upi';

export type CustomerRefundMethod = {
  __typename?: 'CustomerRefundMethod';
  id: Scalars['ID']['output'];
  customer_id: Scalars['String']['output'];
  order_id: Maybe<Scalars['String']['output']>;
  return_id: Maybe<Scalars['String']['output']>;
  type: CustomerRefundMethodTypeEnum;
  account_number_enc: Maybe<Scalars['String']['output']>;
  account_number_hmac: Maybe<Scalars['String']['output']>;
  account_holder_enc: Maybe<Scalars['String']['output']>;
  ifsc_code: Maybe<Scalars['String']['output']>;
  upi_id_enc: Maybe<Scalars['String']['output']>;
  upi_id_hmac: Maybe<Scalars['String']['output']>;
  masked_account: Maybe<Scalars['String']['output']>;
  masked_upi: Maybe<Scalars['String']['output']>;
  masked_holder: Maybe<Scalars['String']['output']>;
  is_default: Scalars['Boolean']['output'];
  created_by: Maybe<Scalars['String']['output']>;
  updated_by: Maybe<Scalars['String']['output']>;
  is_account_verified: Scalars['Boolean']['output'];
  status: Scalars['Boolean']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  return_link: Maybe<Array<Maybe<LinkReturnRefundMethod>>>;
  returns: Maybe<Array<Maybe<Return>>>;
};

export type StockLocationSection = {
  __typename?: 'StockLocationSection';
  id: Scalars['ID']['output'];
  stock_location_id: Scalars['String']['output'];
  address_type: Scalars['String']['output'];
  partner_wh_code: Scalars['String']['output'];
  lead_time: Scalars['String']['output'];
  managed_by: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  stock_location_contact_link: Maybe<LinkStockLocSectionContactLink>;
  stock_location_contact: Maybe<StockLocationContact>;
  stock_location_document_link: Maybe<Array<Maybe<LinkStockLocSectionDocumentLink>>>;
  stock_location_documents: Maybe<Array<Maybe<StockLocationDocument>>>;
  stock_location_link: Maybe<LinkStockLocationStockLocationSection>;
  stock_location: Maybe<StockLocation>;
};

export type StockLocationContact = {
  __typename?: 'StockLocationContact';
  id: Scalars['ID']['output'];
  stock_location_section_id: Scalars['String']['output'];
  first_name: Scalars['String']['output'];
  last_name: Scalars['String']['output'];
  email: Scalars['String']['output'];
  phone_number: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  stock_location_section_link: Maybe<LinkStockLocSectionContactLink>;
  stock_location_section: Maybe<StockLocationSection>;
};

export type StockLocationDocument = {
  __typename?: 'StockLocationDocument';
  id: Scalars['ID']['output'];
  stock_location_section_id: Scalars['String']['output'];
  document_type: Scalars['String']['output'];
  document_number: Scalars['String']['output'];
  pdf_url: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  stock_location_section_link: Maybe<LinkStockLocSectionDocumentLink>;
  stock_location_section: Maybe<StockLocationSection>;
};

export type LocationHierarchy = {
  __typename?: 'LocationHierarchy';
  id: Scalars['ID']['output'];
  parent_location_id: Scalars['String']['output'];
  child_location_id: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ConfigImageResizeConfigImageSize = {
  __typename?: 'ConfigImageResizeConfigImageSize';
  id: Scalars['ID']['output'];
  resize_config_id: Scalars['String']['output'];
  resize_config: ConfigImageResizeConfig;
  image_size_id: Scalars['String']['output'];
  image_size: ConfigImageSize;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ConfigImageResizeConfig = {
  __typename?: 'ConfigImageResizeConfig';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  unique_name: Scalars['String']['output'];
  image_sizes: Array<Maybe<ConfigImageSize>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ConfigImageSize = {
  __typename?: 'ConfigImageSize';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  width: Scalars['Int']['output'];
  height: Scalars['Int']['output'];
  resize_configs: Array<Maybe<ConfigImageResizeConfig>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Partner = {
  __typename?: 'Partner';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  status: Scalars['String']['output'];
  metadata: Maybe<Scalars['String']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  updated_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Tier = {
  __typename?: 'Tier';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  promo_id: Maybe<Scalars['String']['output']>;
  tier_rules: Array<Maybe<TierRule>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  customer_link: Maybe<Array<Maybe<LinkTierTierCustomerCustomer>>>;
  customers: Maybe<Array<Maybe<Customer>>>;
  promotion: Maybe<Promotion>;
};

export type TierRule = {
  __typename?: 'TierRule';
  id: Scalars['ID']['output'];
  min_purchase_value: Scalars['Int']['output'];
  currency_code: Scalars['String']['output'];
  tier_id: Scalars['String']['output'];
  tier: Tier;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type VariantImagesSettings = {
  __typename?: 'VariantImagesSettings';
  product_id: Scalars['ID']['output'];
  base_option_enabled: Scalars['Boolean']['output'];
  base_option_id: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type VideoEncodingJobsReferenceTypeEnum =
  | 'CMS'
  | 'CATALOG';

export type VideoEncodingJobsStatusEnum =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export type VideoEncodingJobs = {
  __typename?: 'VideoEncodingJobs';
  id: Scalars['ID']['output'];
  reference_type: VideoEncodingJobsReferenceTypeEnum;
  file_name: Scalars['String']['output'];
  s3_path: Scalars['String']['output'];
  streaming_url: Maybe<Scalars['String']['output']>;
  thumbnail_video_url: Maybe<Scalars['String']['output']>;
  status: VideoEncodingJobsStatusEnum;
  encoding_job_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Scalars['String']['output'];
  updated_by: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  user: Maybe<User>;
};

export type WishlistReferenceEnum =
  | 'product';

export type Wishlist = {
  __typename?: 'Wishlist';
  id: Scalars['ID']['output'];
  reference: WishlistReferenceEnum;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  customer_link: Maybe<LinkCustomerCustomerWishlistWishlist>;
  customer: Maybe<Customer>;
  product_link: Maybe<Array<Maybe<LinkWishlistWishlistProductProduct>>>;
  products: Maybe<Array<Maybe<Product>>>;
};

export type ExtendPrice = {
  __typename?: 'ExtendPrice';
  id: Scalars['ID']['output'];
  percentage_discount: Scalars['Int']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  price_link: Maybe<Array<Maybe<LinkPricingPriceExtendPriceExtendPrice>>>;
  prices: Maybe<Array<Maybe<Price>>>;
};

export type PayoutTransactions = {
  __typename?: 'PayoutTransactions';
  id: Scalars['ID']['output'];
  provider: Scalars['String']['output'];
  provider_payout_id: Scalars['String']['output'];
  provider_fund_account_id: Maybe<Scalars['String']['output']>;
  return_id: Scalars['String']['output'];
  order_id: Scalars['String']['output'];
  payment_id: Maybe<Scalars['String']['output']>;
  customer_refund_method_id: Maybe<Scalars['String']['output']>;
  type: Maybe<Scalars['String']['output']>;
  type_id: Maybe<Scalars['String']['output']>;
  reference_id: Maybe<Scalars['String']['output']>;
  customer_id: Scalars['String']['output'];
  customer_name: Maybe<Scalars['String']['output']>;
  payout_type: Maybe<Scalars['String']['output']>;
  queue_if_low_balance: Maybe<Scalars['Boolean']['output']>;
  idempotency_key: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  currency: Maybe<Scalars['String']['output']>;
  payout_mode: Scalars['String']['output'];
  purpose: Maybe<Scalars['String']['output']>;
  notes: Maybe<Scalars['JSON']['output']>;
  utr: Maybe<Scalars['String']['output']>;
  status: Maybe<Scalars['String']['output']>;
  status_details: Maybe<Scalars['JSON']['output']>;
  fees: Maybe<Scalars['Float']['output']>;
  tax: Maybe<Scalars['Float']['output']>;
  last_webhook_event: Maybe<Scalars['String']['output']>;
  last_webhook_at: Maybe<Scalars['DateTime']['output']>;
  response_snapshot: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  raw_amount: Scalars['JSON']['output'];
  raw_fees: Maybe<Scalars['JSON']['output']>;
  raw_tax: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShopifyProductVariant = {
  __typename?: 'ShopifyProductVariant';
  id: Scalars['ID']['output'];
  sku: Scalars['String']['output'];
  shopify_product_id: Maybe<Scalars['String']['output']>;
  shopify_variant_id: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PromotionExtensionApplicableOnEnum =
  | 'all'
  | 'app'
  | 'web';

export type PromotionExtension = {
  __typename?: 'PromotionExtension';
  id: Scalars['ID']['output'];
  cart_sub_total: Scalars['Int']['output'];
  promo_code_upper_limit: Scalars['Int']['output'];
  seller_ids: Array<Maybe<Scalars['String']['output']>>;
  first_customer: Scalars['Boolean']['output'];
  for_seller: Scalars['Boolean']['output'];
  is_hidden: Scalars['Boolean']['output'];
  override_existing: Scalars['Boolean']['output'];
  applicable_on: PromotionExtensionApplicableOnEnum;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  promotion_link: Maybe<LinkPromotionPromotionExtension>;
  promotion: Maybe<Promotion>;
};

export type ReturnRefundTypeLink = {
  __typename?: 'ReturnRefundTypeLink';
  id: Scalars['ID']['output'];
  return_id: Scalars['String']['output'];
  type: Scalars['String']['output'];
  type_id: Scalars['String']['output'];
  customer_id: Scalars['String']['output'];
  status: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Scalars['String']['output'];
  updated_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type RefundCategoryNameEnum =
  | 'logistics'
  | 'customer'
  | 'seller';

export type RefundCategory = {
  __typename?: 'RefundCategory';
  id: Scalars['ID']['output'];
  name: RefundCategoryNameEnum;
  description: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  refund_reason_link: Maybe<Array<Maybe<LinkPaymentRefundReasonRefundCategoryRefundCategory>>>;
  refund_reasons: Maybe<Array<Maybe<RefundReason>>>;
};

export type StockLocationAddress = {
  __typename?: 'StockLocationAddress';
  id: Maybe<Scalars['ID']['output']>;
  address_1: Scalars['String']['output'];
  address_2: Maybe<Scalars['String']['output']>;
  company: Maybe<Scalars['String']['output']>;
  country_code: Scalars['String']['output'];
  city: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
  postal_code: Maybe<Scalars['String']['output']>;
  province: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type StockLocation = {
  __typename?: 'StockLocation';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  address_id: Scalars['ID']['output'];
  address: Maybe<StockLocationAddress>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  fulfillment_provider_link: Maybe<Array<Maybe<LinkLocationFulfillmentProvider>>>;
  fulfillment_providers: Maybe<Array<Maybe<FulfillmentProvider>>>;
  fulfillment_set_link: Maybe<Array<Maybe<LinkLocationFulfillmentSet>>>;
  fulfillment_sets: Maybe<Array<Maybe<FulfillmentSet>>>;
  sales_channels_link: Maybe<Array<Maybe<LinkSalesChannelStockLocation>>>;
  sales_channels: Maybe<Array<Maybe<SalesChannel>>>;
  stock_location_extension_link: Maybe<LinkStockLocationStockLocationExtension>;
  stock_location_extension: Maybe<StockLocationExtension>;
  stock_location_section_link: Maybe<LinkStockLocationStockLocationSection>;
  stock_location_section: Maybe<StockLocationSection>;
  seller_link: Maybe<LinkStockLocationStockLocationSellerSeller>;
  seller: Maybe<Seller>;
};

export type InventoryItem = {
  __typename?: 'InventoryItem';
  id: Scalars['ID']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  sku: Maybe<Scalars['String']['output']>;
  origin_country: Maybe<Scalars['String']['output']>;
  hs_code: Maybe<Scalars['String']['output']>;
  mid_code: Maybe<Scalars['String']['output']>;
  material: Maybe<Scalars['String']['output']>;
  weight: Maybe<Scalars['Int']['output']>;
  length: Maybe<Scalars['Int']['output']>;
  height: Maybe<Scalars['Int']['output']>;
  width: Maybe<Scalars['Int']['output']>;
  requires_shipping: Scalars['Boolean']['output'];
  description: Maybe<Scalars['String']['output']>;
  title: Maybe<Scalars['String']['output']>;
  thumbnail: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  location_levels: Maybe<Array<Maybe<InventoryLevel>>>;
  variant_link: Maybe<Array<Maybe<LinkProductVariantInventoryItem>>>;
  variants: Maybe<Array<Maybe<ProductVariant>>>;
  seller_link: Maybe<LinkInventoryInventoryItemSellerSeller>;
  seller: Maybe<Seller>;
};

export type InventoryLevel = {
  __typename?: 'InventoryLevel';
  id: Scalars['ID']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  inventory_item_id: Scalars['String']['output'];
  inventory_item: InventoryItem;
  location_id: Scalars['String']['output'];
  stocked_quantity: Scalars['Int']['output'];
  reserved_quantity: Scalars['Int']['output'];
  incoming_quantity: Scalars['Int']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  stock_locations: Maybe<Array<Maybe<StockLocation>>>;
};

export type ReservationItem = {
  __typename?: 'ReservationItem';
  id: Scalars['ID']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  line_item_id: Maybe<Scalars['String']['output']>;
  inventory_item_id: Scalars['String']['output'];
  inventory_item: InventoryItem;
  location_id: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  external_id: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
};

export type ProductStatus =
  | 'draft'
  | 'proposed'
  | 'published'
  | 'rejected';

export type Product = {
  __typename?: 'Product';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  handle: Scalars['String']['output'];
  subtitle: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  is_giftcard: Scalars['Boolean']['output'];
  status: ProductStatus;
  thumbnail: Maybe<Scalars['String']['output']>;
  width: Maybe<Scalars['Float']['output']>;
  weight: Maybe<Scalars['Float']['output']>;
  length: Maybe<Scalars['Float']['output']>;
  height: Maybe<Scalars['Float']['output']>;
  origin_country: Maybe<Scalars['String']['output']>;
  hs_code: Maybe<Scalars['String']['output']>;
  mid_code: Maybe<Scalars['String']['output']>;
  material: Maybe<Scalars['String']['output']>;
  collection: Maybe<ProductCollection>;
  collection_id: Maybe<Scalars['String']['output']>;
  categories: Maybe<Array<Maybe<ProductCategory>>>;
  type: Maybe<ProductType>;
  type_id: Maybe<Scalars['String']['output']>;
  tags: Array<ProductTag>;
  variants: Array<ProductVariant>;
  options: Array<ProductOption>;
  images: Array<ProductImage>;
  discountable: Maybe<Scalars['Boolean']['output']>;
  external_id: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  sales_channels_link: Maybe<Array<Maybe<LinkProductSalesChannel>>>;
  sales_channels: Maybe<Array<Maybe<SalesChannel>>>;
  shipping_profiles_link: Maybe<LinkProductShippingProfile>;
  shipping_profile: Maybe<ShippingProfile>;
  attribute_value_link: Maybe<Array<Maybe<LinkProductProductAttributeAttributeValue>>>;
  attribute_values: Maybe<Array<Maybe<AttributeValue>>>;
  brand_link: Maybe<Array<Maybe<LinkProductProductBrandBrand>>>;
  brands: Maybe<Array<Maybe<Brand>>>;
  wishlist_link: Maybe<Array<Maybe<LinkWishlistWishlistProductProduct>>>;
  wishlists: Maybe<Array<Maybe<Wishlist>>>;
  seller_link: Maybe<LinkProductProductSellerSeller>;
  seller: Maybe<Seller>;
};

export type ProductVariant = {
  __typename?: 'ProductVariant';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  sku: Maybe<Scalars['String']['output']>;
  barcode: Maybe<Scalars['String']['output']>;
  ean: Maybe<Scalars['String']['output']>;
  upc: Maybe<Scalars['String']['output']>;
  allow_backorder: Scalars['Boolean']['output'];
  manage_inventory: Scalars['Boolean']['output'];
  requires_shipping: Scalars['Boolean']['output'];
  hs_code: Maybe<Scalars['String']['output']>;
  origin_country: Maybe<Scalars['String']['output']>;
  mid_code: Maybe<Scalars['String']['output']>;
  material: Maybe<Scalars['String']['output']>;
  weight: Maybe<Scalars['Float']['output']>;
  length: Maybe<Scalars['Float']['output']>;
  height: Maybe<Scalars['Float']['output']>;
  width: Maybe<Scalars['Float']['output']>;
  options: Array<ProductOptionValue>;
  images: Array<ProductImage>;
  thumbnail: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  product: Maybe<Product>;
  product_id: Maybe<Scalars['String']['output']>;
  variant_rank: Maybe<Scalars['Int']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  inventory_items: Maybe<Array<Maybe<LinkProductVariantInventoryItem>>>;
  inventory: Maybe<Array<Maybe<InventoryItem>>>;
  price_set_link: Maybe<LinkProductVariantPriceSet>;
  price_set: Maybe<PriceSet>;
  order_items: Maybe<Array<Maybe<OrderLineItem>>>;
};

export type ProductCategory = {
  __typename?: 'ProductCategory';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  description: Scalars['String']['output'];
  handle: Scalars['String']['output'];
  is_active: Scalars['Boolean']['output'];
  is_internal: Scalars['Boolean']['output'];
  rank: Scalars['Int']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  parent_category: Maybe<ProductCategory>;
  parent_category_id: Maybe<Scalars['String']['output']>;
  category_children: Array<ProductCategory>;
  products: Array<Product>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  attribute_link: Maybe<Array<Maybe<LinkProductProductCategoryAttributeAttribute>>>;
  attributes: Maybe<Array<Maybe<Attribute>>>;
};

export type ProductTag = {
  __typename?: 'ProductTag';
  id: Scalars['ID']['output'];
  value: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  products: Maybe<Array<Maybe<Product>>>;
};

export type ProductCollection = {
  __typename?: 'ProductCollection';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  handle: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  products: Maybe<Array<Maybe<Product>>>;
};

export type ProductType = {
  __typename?: 'ProductType';
  id: Scalars['ID']['output'];
  value: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ProductOption = {
  __typename?: 'ProductOption';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  product: Maybe<Product>;
  product_id: Maybe<Scalars['String']['output']>;
  values: Array<ProductOptionValue>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ProductImage = {
  __typename?: 'ProductImage';
  id: Scalars['ID']['output'];
  url: Scalars['String']['output'];
  rank: Scalars['Int']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ProductOptionValue = {
  __typename?: 'ProductOptionValue';
  id: Scalars['ID']['output'];
  value: Scalars['String']['output'];
  option: Maybe<ProductOption>;
  option_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PriceSet = {
  __typename?: 'PriceSet';
  id: Scalars['ID']['output'];
  prices: Array<Maybe<Price>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  variant_link: Maybe<LinkProductVariantPriceSet>;
  variant: Maybe<ProductVariant>;
  shipping_option_link: Maybe<LinkShippingOptionPriceSet>;
  shipping_option: Maybe<ShippingOption>;
};

export type PriceListStatusEnum =
  | 'active'
  | 'draft';

export type PriceListTypeEnum =
  | 'sale'
  | 'override';

export type PriceList = {
  __typename?: 'PriceList';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  description: Scalars['String']['output'];
  status: PriceListStatusEnum;
  type: PriceListTypeEnum;
  starts_at: Maybe<Scalars['DateTime']['output']>;
  ends_at: Maybe<Scalars['DateTime']['output']>;
  rules_count: Maybe<Scalars['Int']['output']>;
  prices: Array<Maybe<Price>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  seller_link: Maybe<LinkPricingPriceListSellerSeller>;
  seller: Maybe<Seller>;
};

export type Price = {
  __typename?: 'Price';
  id: Scalars['ID']['output'];
  title: Maybe<Scalars['String']['output']>;
  currency_code: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  min_quantity: Maybe<Scalars['Float']['output']>;
  max_quantity: Maybe<Scalars['Float']['output']>;
  rules_count: Maybe<Scalars['Int']['output']>;
  price_set_id: Scalars['String']['output'];
  price_set: PriceSet;
  price_list_id: Maybe<Scalars['String']['output']>;
  price_list: Maybe<PriceList>;
  raw_amount: Scalars['JSON']['output'];
  raw_min_quantity: Maybe<Scalars['JSON']['output']>;
  raw_max_quantity: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  extend_price_link: Maybe<LinkPricingPriceExtendPriceExtendPrice>;
  extend_price: Maybe<ExtendPrice>;
};

export type PricePreference = {
  __typename?: 'PricePreference';
  id: Scalars['ID']['output'];
  attribute: Scalars['String']['output'];
  value: Maybe<Scalars['String']['output']>;
  is_tax_inclusive: Scalars['Boolean']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PromotionTypeEnum =
  | 'standard'
  | 'buyget';

export type PromotionStatusEnum =
  | 'draft'
  | 'active'
  | 'inactive';

export type ApplicationMethod = {
  __typename?: 'ApplicationMethod';
  promotion: Promotion;
  id: Scalars['ID']['output'];
  value: Maybe<Scalars['Float']['output']>;
  currency_code: Maybe<Scalars['String']['output']>;
  max_quantity: Maybe<Scalars['Int']['output']>;
  apply_to_quantity: Maybe<Scalars['Int']['output']>;
  buy_rules_min_quantity: Maybe<Scalars['Int']['output']>;
  type: ApplicationMethodTypeEnum;
  target_type: ApplicationMethodTargetTypeEnum;
  allocation: Maybe<ApplicationMethodAllocationEnum>;
  promotion_id: Scalars['String']['output'];
  target_rules: Array<Maybe<PromotionRule>>;
  buy_rules: Array<Maybe<PromotionRule>>;
  raw_value: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Promotion = {
  __typename?: 'Promotion';
  id: Scalars['ID']['output'];
  code: Scalars['String']['output'];
  is_automatic: Scalars['Boolean']['output'];
  is_tax_inclusive: Scalars['Boolean']['output'];
  limit: Maybe<Scalars['Int']['output']>;
  used: Scalars['Int']['output'];
  type: PromotionTypeEnum;
  status: PromotionStatusEnum;
  campaign_id: Maybe<Scalars['String']['output']>;
  campaign: Maybe<Campaign>;
  application_method: Maybe<ApplicationMethod>;
  rules: Array<Maybe<PromotionRule>>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  order_link: Maybe<LinkOrderPromotion>;
  promotion_extension_link: Maybe<Array<Maybe<LinkPromotionPromotionExtension>>>;
  promotion_extensions: Maybe<Array<Maybe<PromotionExtension>>>;
  seller_link: Maybe<LinkPromotionPromotionSellerSeller>;
  seller: Maybe<Seller>;
};

export type ApplicationMethodTypeEnum =
  | 'fixed'
  | 'percentage';

export type ApplicationMethodTargetTypeEnum =
  | 'order'
  | 'shipping_methods'
  | 'items';

export type ApplicationMethodAllocationEnum =
  | 'each'
  | 'across'
  | 'once';

export type CampaignBudget = {
  __typename?: 'CampaignBudget';
  campaign: Campaign;
  id: Scalars['ID']['output'];
  type: CampaignBudgetTypeEnum;
  currency_code: Maybe<Scalars['String']['output']>;
  limit: Maybe<Scalars['Float']['output']>;
  used: Scalars['Float']['output'];
  campaign_id: Scalars['String']['output'];
  attribute: Maybe<Scalars['String']['output']>;
  usages: Array<Maybe<CampaignBudgetUsage>>;
  raw_limit: Maybe<Scalars['JSON']['output']>;
  raw_used: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Campaign = {
  __typename?: 'Campaign';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  campaign_identifier: Scalars['String']['output'];
  starts_at: Maybe<Scalars['DateTime']['output']>;
  ends_at: Maybe<Scalars['DateTime']['output']>;
  budget: Maybe<CampaignBudget>;
  promotions: Array<Maybe<Promotion>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  seller_link: Maybe<LinkPromotionCampaignSellerSeller>;
  seller: Maybe<Seller>;
};

export type CampaignBudgetTypeEnum =
  | 'spend'
  | 'usage'
  | 'use_by_attribute'
  | 'spend_by_attribute';

export type CampaignBudgetUsage = {
  __typename?: 'CampaignBudgetUsage';
  id: Scalars['ID']['output'];
  attribute_value: Scalars['String']['output'];
  used: Scalars['Float']['output'];
  budget_id: Scalars['String']['output'];
  budget: CampaignBudget;
  raw_used: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PromotionRuleOperatorEnum =
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'eq'
  | 'ne'
  | 'in';

export type PromotionRule = {
  __typename?: 'PromotionRule';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  attribute: Scalars['String']['output'];
  operator: PromotionRuleOperatorEnum;
  values: Array<Maybe<PromotionRuleValue>>;
  promotions: Array<Maybe<Promotion>>;
  method_target_rules: Array<Maybe<ApplicationMethod>>;
  method_buy_rules: Array<Maybe<ApplicationMethod>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PromotionRuleValue = {
  __typename?: 'PromotionRuleValue';
  id: Scalars['ID']['output'];
  value: Scalars['String']['output'];
  promotion_rule_id: Scalars['String']['output'];
  promotion_rule: PromotionRule;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerAddress = {
  __typename?: 'CustomerAddress';
  id: Scalars['ID']['output'];
  address_name: Maybe<Scalars['String']['output']>;
  is_default_shipping: Scalars['Boolean']['output'];
  is_default_billing: Scalars['Boolean']['output'];
  company: Maybe<Scalars['String']['output']>;
  first_name: Maybe<Scalars['String']['output']>;
  last_name: Maybe<Scalars['String']['output']>;
  address_1: Maybe<Scalars['String']['output']>;
  address_2: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  country_code: Maybe<Scalars['String']['output']>;
  province: Maybe<Scalars['String']['output']>;
  postal_code: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  customer_id: Scalars['String']['output'];
  customer: Customer;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerGroupCustomer = {
  __typename?: 'CustomerGroupCustomer';
  id: Scalars['ID']['output'];
  created_by: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  customer_id: Scalars['String']['output'];
  customer: Customer;
  customer_group_id: Scalars['String']['output'];
  customer_group: CustomerGroup;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerGroup = {
  __typename?: 'CustomerGroup';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  customers: Array<Maybe<Customer>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Customer = {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
  company_name: Maybe<Scalars['String']['output']>;
  first_name: Maybe<Scalars['String']['output']>;
  last_name: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
  has_account: Scalars['Boolean']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  groups: Array<Maybe<CustomerGroup>>;
  addresses: Array<Maybe<CustomerAddress>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  account_holder_link: Maybe<Array<Maybe<LinkCustomerAccountHolder>>>;
  account_holders: Maybe<Array<Maybe<AccountHolder>>>;
  carts: Maybe<Array<Maybe<Cart>>>;
  orders: Maybe<Array<Maybe<Order>>>;
  customer_bank_detail_link: Maybe<Array<Maybe<LinkCustomerCustomerCustomerBankDetailCustomerBankDetail>>>;
  customer_bank_details: Maybe<Array<Maybe<CustomerBankDetail>>>;
  customer_upi_detail_link: Maybe<Array<Maybe<LinkCustomerCustomerCustomerUpiDetailCustomerUpiDetail>>>;
  customer_upi_details: Maybe<Array<Maybe<CustomerUpiDetail>>>;
  wishlist_link: Maybe<LinkCustomerCustomerWishlistWishlist>;
  wishlist: Maybe<Wishlist>;
  tier_link: Maybe<LinkTierTierCustomerCustomer>;
  tier: Maybe<Tier>;
  seller_link: Maybe<Array<Maybe<LinkSellerSellerCustomerCustomer>>>;
  sellers: Maybe<Array<Maybe<Seller>>>;
};

export type SalesChannel = {
  __typename?: 'SalesChannel';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  is_disabled: Scalars['Boolean']['output'];
  created_at: Scalars['DateTime']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  products_link: Maybe<Array<Maybe<LinkProductSalesChannel>>>;
  api_keys_link: Maybe<Array<Maybe<LinkPublishableApiKeySalesChannel>>>;
  publishable_api_keys: Maybe<Array<Maybe<ApiKey>>>;
  carts: Maybe<Array<Maybe<Cart>>>;
  orders: Maybe<Array<Maybe<Order>>>;
  locations_link: Maybe<Array<Maybe<LinkSalesChannelStockLocation>>>;
  stock_locations: Maybe<Array<Maybe<StockLocation>>>;
};

export type Cart = {
  __typename?: 'Cart';
  id: Scalars['ID']['output'];
  region_id: Maybe<Scalars['String']['output']>;
  customer_id: Maybe<Scalars['String']['output']>;
  sales_channel_id: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  currency_code: Scalars['String']['output'];
  locale: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  completed_at: Maybe<Scalars['DateTime']['output']>;
  shipping_address_id: Maybe<Scalars['String']['output']>;
  shipping_address: Maybe<Address>;
  billing_address_id: Maybe<Scalars['String']['output']>;
  billing_address: Maybe<Address>;
  items: Array<Maybe<LineItem>>;
  credit_lines: Array<Maybe<CreditLine>>;
  shipping_methods: Array<Maybe<ShippingMethod>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  payment_collection_link: Maybe<LinkCartPaymentCollection>;
  payment_collection: Maybe<PaymentCollection>;
  cart_link: Maybe<Array<Maybe<LinkCartPromotion>>>;
  promotions: Maybe<Array<Maybe<Promotion>>>;
  order_link: Maybe<LinkOrderCart>;
  order: Maybe<Order>;
  customer: Maybe<Customer>;
  region: Maybe<Region>;
  sales_channel: Maybe<SalesChannel>;
};

export type CreditLine = {
  __typename?: 'CreditLine';
  id: Scalars['ID']['output'];
  cart_id: Scalars['String']['output'];
  cart: Cart;
  reference: Maybe<Scalars['String']['output']>;
  reference_id: Maybe<Scalars['String']['output']>;
  amount: Scalars['Float']['output'];
  raw_amount: Scalars['JSON']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Address = {
  __typename?: 'Address';
  id: Scalars['ID']['output'];
  customer_id: Maybe<Scalars['String']['output']>;
  company: Maybe<Scalars['String']['output']>;
  first_name: Maybe<Scalars['String']['output']>;
  last_name: Maybe<Scalars['String']['output']>;
  address_1: Maybe<Scalars['String']['output']>;
  address_2: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  country_code: Maybe<Scalars['String']['output']>;
  province: Maybe<Scalars['String']['output']>;
  postal_code: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type LineItem = {
  __typename?: 'LineItem';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  subtitle: Maybe<Scalars['String']['output']>;
  thumbnail: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
  variant_id: Maybe<Scalars['String']['output']>;
  product_id: Maybe<Scalars['String']['output']>;
  product_title: Maybe<Scalars['String']['output']>;
  product_description: Maybe<Scalars['String']['output']>;
  product_subtitle: Maybe<Scalars['String']['output']>;
  product_type: Maybe<Scalars['String']['output']>;
  product_type_id: Maybe<Scalars['String']['output']>;
  product_collection: Maybe<Scalars['String']['output']>;
  product_handle: Maybe<Scalars['String']['output']>;
  variant_sku: Maybe<Scalars['String']['output']>;
  variant_barcode: Maybe<Scalars['String']['output']>;
  variant_title: Maybe<Scalars['String']['output']>;
  variant_option_values: Maybe<Scalars['JSON']['output']>;
  requires_shipping: Scalars['Boolean']['output'];
  is_discountable: Scalars['Boolean']['output'];
  is_giftcard: Scalars['Boolean']['output'];
  is_tax_inclusive: Scalars['Boolean']['output'];
  is_custom_price: Scalars['Boolean']['output'];
  compare_at_unit_price: Maybe<Scalars['Float']['output']>;
  unit_price: Scalars['Float']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  adjustments: Array<Maybe<LineItemAdjustment>>;
  tax_lines: Array<Maybe<LineItemTaxLine>>;
  cart_id: Scalars['String']['output'];
  cart: Cart;
  raw_compare_at_unit_price: Maybe<Scalars['JSON']['output']>;
  raw_unit_price: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  variant: Maybe<ProductVariant>;
};

export type LineItemAdjustment = {
  __typename?: 'LineItemAdjustment';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  code: Maybe<Scalars['String']['output']>;
  amount: Scalars['Float']['output'];
  is_tax_inclusive: Scalars['Boolean']['output'];
  provider_id: Maybe<Scalars['String']['output']>;
  promotion_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  item_id: Scalars['String']['output'];
  item: LineItem;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  promotion: Maybe<Promotion>;
};

export type LineItemTaxLine = {
  __typename?: 'LineItemTaxLine';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  rate: Scalars['Float']['output'];
  provider_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  tax_rate_id: Maybe<Scalars['String']['output']>;
  item_id: Scalars['String']['output'];
  item: LineItem;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShippingMethod = {
  __typename?: 'ShippingMethod';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  description: Maybe<Scalars['JSON']['output']>;
  amount: Scalars['Float']['output'];
  is_tax_inclusive: Scalars['Boolean']['output'];
  shipping_option_id: Maybe<Scalars['String']['output']>;
  data: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  cart_id: Scalars['String']['output'];
  cart: Cart;
  tax_lines: Array<Maybe<ShippingMethodTaxLine>>;
  adjustments: Array<Maybe<ShippingMethodAdjustment>>;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShippingMethodAdjustment = {
  __typename?: 'ShippingMethodAdjustment';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  code: Maybe<Scalars['String']['output']>;
  amount: Scalars['Float']['output'];
  provider_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  promotion_id: Maybe<Scalars['String']['output']>;
  shipping_method_id: Scalars['String']['output'];
  shipping_method: ShippingMethod;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShippingMethodTaxLine = {
  __typename?: 'ShippingMethodTaxLine';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  rate: Scalars['Float']['output'];
  provider_id: Maybe<Scalars['String']['output']>;
  tax_rate_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  shipping_method_id: Scalars['String']['output'];
  shipping_method: ShippingMethod;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Region = {
  __typename?: 'Region';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  currency_code: Scalars['String']['output'];
  automatic_taxes: Scalars['Boolean']['output'];
  countries: Array<Maybe<Country>>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  carts: Maybe<Array<Maybe<Cart>>>;
  orders: Maybe<Array<Maybe<Order>>>;
  payment_provider_link: Maybe<Array<Maybe<LinkRegionPaymentProvider>>>;
  payment_providers: Maybe<Array<Maybe<PaymentProvider>>>;
};

export type Country = {
  __typename?: 'Country';
  iso_2: Scalars['ID']['output'];
  iso_3: Scalars['String']['output'];
  num_code: Scalars['String']['output'];
  name: Scalars['String']['output'];
  display_name: Scalars['String']['output'];
  region_id: Maybe<Scalars['String']['output']>;
  region: Maybe<Region>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ApiKeyTypeEnum =
  | 'publishable'
  | 'secret';

export type ApiKey = {
  __typename?: 'ApiKey';
  id: Scalars['ID']['output'];
  token: Scalars['String']['output'];
  salt: Scalars['String']['output'];
  redacted: Scalars['String']['output'];
  title: Scalars['String']['output'];
  type: ApiKeyTypeEnum;
  last_used_at: Maybe<Scalars['DateTime']['output']>;
  created_by: Scalars['String']['output'];
  revoked_by: Maybe<Scalars['String']['output']>;
  revoked_at: Maybe<Scalars['DateTime']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  sales_channels_link: Maybe<Array<Maybe<LinkPublishableApiKeySalesChannel>>>;
  sales_channels: Maybe<Array<Maybe<SalesChannel>>>;
};

export type Store = {
  __typename?: 'Store';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  default_sales_channel_id: Maybe<Scalars['String']['output']>;
  default_region_id: Maybe<Scalars['String']['output']>;
  default_location_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  supported_currencies: Array<Maybe<StoreCurrency>>;
  supported_locales: Array<Maybe<StoreLocale>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type StoreCurrency = {
  __typename?: 'StoreCurrency';
  id: Scalars['ID']['output'];
  currency_code: Scalars['String']['output'];
  is_default: Scalars['Boolean']['output'];
  store_id: Maybe<Scalars['String']['output']>;
  store: Maybe<Store>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  currency: Maybe<Currency>;
};

export type StoreLocale = {
  __typename?: 'StoreLocale';
  id: Scalars['ID']['output'];
  locale_code: Scalars['String']['output'];
  store_id: Maybe<Scalars['String']['output']>;
  store: Maybe<Store>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type TaxRate = {
  __typename?: 'TaxRate';
  id: Scalars['ID']['output'];
  rate: Maybe<Scalars['Float']['output']>;
  code: Scalars['String']['output'];
  name: Scalars['String']['output'];
  is_default: Scalars['Boolean']['output'];
  is_combinable: Scalars['Boolean']['output'];
  tax_region_id: Scalars['String']['output'];
  tax_region: TaxRegion;
  rules: Array<Maybe<TaxRateRule>>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type TaxRegion = {
  __typename?: 'TaxRegion';
  id: Scalars['ID']['output'];
  country_code: Scalars['String']['output'];
  province_code: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  provider_id: Maybe<Scalars['String']['output']>;
  provider: Maybe<TaxProvider>;
  parent_id: Maybe<Scalars['String']['output']>;
  parent: Maybe<TaxRegion>;
  children: Array<Maybe<TaxRegion>>;
  tax_rates: Array<Maybe<TaxRate>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type TaxRateRule = {
  __typename?: 'TaxRateRule';
  id: Scalars['ID']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  tax_rate_id: Scalars['String']['output'];
  tax_rate: TaxRate;
  reference: Scalars['String']['output'];
  reference_id: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type TaxProvider = {
  __typename?: 'TaxProvider';
  id: Scalars['ID']['output'];
  is_enabled: Scalars['Boolean']['output'];
  regions: Array<Maybe<TaxRegion>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Currency = {
  __typename?: 'Currency';
  code: Scalars['ID']['output'];
  symbol: Scalars['String']['output'];
  symbol_native: Scalars['String']['output'];
  name: Scalars['String']['output'];
  decimal_digits: Scalars['Int']['output'];
  rounding: Scalars['Float']['output'];
  raw_rounding: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type AccountHolder = {
  __typename?: 'AccountHolder';
  id: Scalars['ID']['output'];
  provider_id: Scalars['String']['output'];
  external_id: Scalars['String']['output'];
  email: Maybe<Scalars['String']['output']>;
  data: Scalars['JSON']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  customer_link: Maybe<LinkCustomerAccountHolder>;
  customer: Maybe<Customer>;
};

export type Capture = {
  __typename?: 'Capture';
  id: Scalars['ID']['output'];
  amount: Scalars['Float']['output'];
  payment_id: Scalars['String']['output'];
  payment: Payment;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PaymentCollectionStatusEnum =
  | 'not_paid'
  | 'awaiting'
  | 'authorized'
  | 'partially_authorized'
  | 'canceled'
  | 'failed'
  | 'partially_captured'
  | 'completed';

export type PaymentCollection = {
  __typename?: 'PaymentCollection';
  id: Scalars['ID']['output'];
  currency_code: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  authorized_amount: Maybe<Scalars['Float']['output']>;
  captured_amount: Maybe<Scalars['Float']['output']>;
  refunded_amount: Maybe<Scalars['Float']['output']>;
  completed_at: Maybe<Scalars['DateTime']['output']>;
  status: PaymentCollectionStatusEnum;
  metadata: Maybe<Scalars['JSON']['output']>;
  payment_providers: Array<Maybe<PaymentProvider>>;
  payment_sessions: Array<Maybe<PaymentSession>>;
  payments: Array<Maybe<Payment>>;
  raw_amount: Scalars['JSON']['output'];
  raw_authorized_amount: Maybe<Scalars['JSON']['output']>;
  raw_captured_amount: Maybe<Scalars['JSON']['output']>;
  raw_refunded_amount: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  cart_link: Maybe<LinkCartPaymentCollection>;
  cart: Maybe<Cart>;
  order_link: Maybe<LinkOrderPaymentCollection>;
  order: Maybe<Order>;
};

export type PaymentProvider = {
  __typename?: 'PaymentProvider';
  id: Scalars['ID']['output'];
  is_enabled: Scalars['Boolean']['output'];
  payment_collections: Array<Maybe<PaymentCollection>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  region_link: Maybe<Array<Maybe<LinkRegionPaymentProvider>>>;
  regions: Maybe<Array<Maybe<Region>>>;
};

export type PaymentSessionStatusEnum =
  | 'authorized'
  | 'captured'
  | 'pending'
  | 'requires_more'
  | 'error'
  | 'canceled';

export type Payment = {
  __typename?: 'Payment';
  payment_session: PaymentSession;
  id: Scalars['ID']['output'];
  amount: Scalars['Float']['output'];
  currency_code: Scalars['String']['output'];
  provider_id: Scalars['String']['output'];
  data: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  captured_at: Maybe<Scalars['DateTime']['output']>;
  canceled_at: Maybe<Scalars['DateTime']['output']>;
  payment_collection_id: Scalars['String']['output'];
  payment_collection: PaymentCollection;
  payment_session_id: Scalars['String']['output'];
  refunds: Array<Maybe<Refund>>;
  captures: Array<Maybe<Capture>>;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PaymentSession = {
  __typename?: 'PaymentSession';
  id: Scalars['ID']['output'];
  currency_code: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  provider_id: Scalars['String']['output'];
  data: Scalars['JSON']['output'];
  context: Maybe<Scalars['JSON']['output']>;
  status: PaymentSessionStatusEnum;
  authorized_at: Maybe<Scalars['DateTime']['output']>;
  payment_collection_id: Scalars['String']['output'];
  payment_collection: PaymentCollection;
  payment: Maybe<Payment>;
  metadata: Maybe<Scalars['JSON']['output']>;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type RefundReason = {
  __typename?: 'RefundReason';
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  code: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  refunds: Array<Maybe<Refund>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  refund_category_link: Maybe<LinkPaymentRefundReasonRefundCategoryRefundCategory>;
  refund_category: Maybe<RefundCategory>;
};

export type Refund = {
  __typename?: 'Refund';
  id: Scalars['ID']['output'];
  amount: Scalars['Float']['output'];
  payment_id: Scalars['String']['output'];
  payment: Payment;
  refund_reason_id: Maybe<Scalars['String']['output']>;
  refund_reason: Maybe<RefundReason>;
  note: Maybe<Scalars['String']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ChangeActionType =
  | 'CANCEL_RETURN_ITEM'
  | 'FULFILL_ITEM'
  | 'CANCEL_ITEM_FULFILLMENT'
  | 'ITEM_ADD'
  | 'ITEM_REMOVE'
  | 'ITEM_UPDATE'
  | 'RECEIVE_DAMAGED_RETURN_ITEM'
  | 'RECEIVE_RETURN_ITEM'
  | 'RETURN_ITEM'
  | 'SHIPPING_ADD'
  | 'SHIPPING_REMOVE'
  | 'SHIP_ITEM'
  | 'WRITE_OFF_ITEM'
  | 'REINSTATE_ITEM';

export type OrderSummary = {
  __typename?: 'OrderSummary';
  pending_difference: Maybe<Scalars['Float']['output']>;
  current_order_total: Maybe<Scalars['Float']['output']>;
  original_order_total: Maybe<Scalars['Float']['output']>;
  transaction_total: Maybe<Scalars['Float']['output']>;
  paid_total: Maybe<Scalars['Float']['output']>;
  refunded_total: Maybe<Scalars['Float']['output']>;
  credit_line_total: Maybe<Scalars['Float']['output']>;
  accounting_total: Maybe<Scalars['Float']['output']>;
  raw_pending_difference: Maybe<Scalars['JSON']['output']>;
  raw_current_order_total: Maybe<Scalars['JSON']['output']>;
  raw_original_order_total: Maybe<Scalars['JSON']['output']>;
  raw_transaction_total: Maybe<Scalars['JSON']['output']>;
  raw_paid_total: Maybe<Scalars['JSON']['output']>;
  raw_refunded_total: Maybe<Scalars['JSON']['output']>;
  raw_credit_line_total: Maybe<Scalars['JSON']['output']>;
  raw_accounting_total: Maybe<Scalars['JSON']['output']>;
};

export type OrderShippingMethodAdjustment = {
  __typename?: 'OrderShippingMethodAdjustment';
  id: Scalars['ID']['output'];
  code: Maybe<Scalars['String']['output']>;
  amount: Maybe<Scalars['Float']['output']>;
  order_id: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  promotion_id: Maybe<Scalars['String']['output']>;
  provider_id: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
  shipping_method: Maybe<OrderShippingMethod>;
  shipping_method_id: Scalars['String']['output'];
};

export type OrderLineItemAdjustment = {
  __typename?: 'OrderLineItemAdjustment';
  id: Scalars['ID']['output'];
  code: Maybe<Scalars['String']['output']>;
  amount: Maybe<Scalars['Float']['output']>;
  order_id: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  promotion_id: Maybe<Scalars['String']['output']>;
  provider_id: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
  item: Maybe<OrderLineItem>;
  item_id: Scalars['String']['output'];
};

export type OrderShippingMethodTaxLine = {
  __typename?: 'OrderShippingMethodTaxLine';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  tax_rate_id: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  rate: Maybe<Scalars['Float']['output']>;
  provider_id: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
  shipping_method: Maybe<OrderShippingMethod>;
  shipping_method_id: Scalars['String']['output'];
  total: Maybe<Scalars['Float']['output']>;
  subtotal: Maybe<Scalars['Float']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
};

export type OrderLineItemTaxLine = {
  __typename?: 'OrderLineItemTaxLine';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  tax_rate_id: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  rate: Maybe<Scalars['Float']['output']>;
  provider_id: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
  item: Maybe<OrderLineItem>;
  item_id: Scalars['String']['output'];
  total: Maybe<Scalars['Float']['output']>;
  subtotal: Maybe<Scalars['Float']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
};

export type OrderAddress = {
  __typename?: 'OrderAddress';
  id: Scalars['ID']['output'];
  customer_id: Maybe<Scalars['String']['output']>;
  first_name: Maybe<Scalars['String']['output']>;
  last_name: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
  company: Maybe<Scalars['String']['output']>;
  address_1: Maybe<Scalars['String']['output']>;
  address_2: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  country_code: Maybe<Scalars['String']['output']>;
  province: Maybe<Scalars['String']['output']>;
  postal_code: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
};

export type OrderShippingMethod = {
  __typename?: 'OrderShippingMethod';
  id: Scalars['ID']['output'];
  order_id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  amount: Maybe<Scalars['Float']['output']>;
  raw_amount: Maybe<Scalars['JSON']['output']>;
  is_tax_inclusive: Maybe<Scalars['Boolean']['output']>;
  shipping_option_id: Maybe<Scalars['String']['output']>;
  data: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  tax_lines: Maybe<Array<Maybe<OrderShippingMethodTaxLine>>>;
  adjustments: Maybe<Array<Maybe<OrderShippingMethodAdjustment>>>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
  original_total: Maybe<Scalars['Float']['output']>;
  original_subtotal: Maybe<Scalars['Float']['output']>;
  original_tax_total: Maybe<Scalars['Float']['output']>;
  total: Maybe<Scalars['Float']['output']>;
  subtotal: Maybe<Scalars['Float']['output']>;
  tax_total: Maybe<Scalars['Float']['output']>;
  discount_total: Maybe<Scalars['Float']['output']>;
  discount_tax_total: Maybe<Scalars['Float']['output']>;
  raw_original_total: Maybe<Scalars['JSON']['output']>;
  raw_original_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_tax_total: Maybe<Scalars['JSON']['output']>;
};

export type OrderLineItem = {
  __typename?: 'OrderLineItem';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  subtitle: Maybe<Scalars['String']['output']>;
  thumbnail: Maybe<Scalars['String']['output']>;
  variant_id: Maybe<Scalars['String']['output']>;
  product_id: Maybe<Scalars['String']['output']>;
  product_title: Maybe<Scalars['String']['output']>;
  product_description: Maybe<Scalars['String']['output']>;
  product_subtitle: Maybe<Scalars['String']['output']>;
  product_type: Maybe<Scalars['String']['output']>;
  product_type_id: Maybe<Scalars['String']['output']>;
  product_collection: Maybe<Scalars['String']['output']>;
  product_handle: Maybe<Scalars['String']['output']>;
  variant_sku: Maybe<Scalars['String']['output']>;
  variant_barcode: Maybe<Scalars['String']['output']>;
  variant_title: Maybe<Scalars['String']['output']>;
  variant_option_values: Maybe<Scalars['JSON']['output']>;
  requires_shipping: Scalars['Boolean']['output'];
  is_discountable: Scalars['Boolean']['output'];
  is_tax_inclusive: Scalars['Boolean']['output'];
  compare_at_unit_price: Maybe<Scalars['Float']['output']>;
  raw_compare_at_unit_price: Maybe<Scalars['JSON']['output']>;
  unit_price: Scalars['Float']['output'];
  raw_unit_price: Maybe<Scalars['JSON']['output']>;
  quantity: Scalars['Int']['output'];
  raw_quantity: Maybe<Scalars['JSON']['output']>;
  tax_lines: Maybe<Array<Maybe<OrderLineItemTaxLine>>>;
  adjustments: Maybe<Array<Maybe<OrderLineItemAdjustment>>>;
  detail: OrderItem;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  original_total: Maybe<Scalars['Float']['output']>;
  original_subtotal: Maybe<Scalars['Float']['output']>;
  original_tax_total: Maybe<Scalars['Float']['output']>;
  item_total: Maybe<Scalars['Float']['output']>;
  item_subtotal: Maybe<Scalars['Float']['output']>;
  item_tax_total: Maybe<Scalars['Float']['output']>;
  total: Maybe<Scalars['Float']['output']>;
  subtotal: Maybe<Scalars['Float']['output']>;
  tax_total: Maybe<Scalars['Float']['output']>;
  discount_total: Maybe<Scalars['Float']['output']>;
  discount_tax_total: Maybe<Scalars['Float']['output']>;
  refundable_total: Maybe<Scalars['Float']['output']>;
  refundable_total_per_unit: Maybe<Scalars['Float']['output']>;
  raw_original_total: Maybe<Scalars['JSON']['output']>;
  raw_original_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_item_total: Maybe<Scalars['JSON']['output']>;
  raw_item_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_item_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_refundable_total: Maybe<Scalars['JSON']['output']>;
  raw_refundable_total_per_unit: Maybe<Scalars['JSON']['output']>;
  product: Maybe<Product>;
  variant: Maybe<ProductVariant>;
  commission_lines: Maybe<Array<Maybe<CommissionLine>>>;
};

export type OrderItem = {
  __typename?: 'OrderItem';
  id: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
  unit_price: Scalars['Float']['output'];
  raw_unit_price: Maybe<Scalars['JSON']['output']>;
  compare_at_unit_price: Scalars['Float']['output'];
  raw_compare_at_unit_price: Maybe<Scalars['JSON']['output']>;
  delivered_quantity: Scalars['Int']['output'];
  raw_delivered_quantity: Maybe<Scalars['JSON']['output']>;
  item_id: Scalars['String']['output'];
  item: OrderLineItem;
  quantity: Scalars['Int']['output'];
  raw_quantity: Maybe<Scalars['JSON']['output']>;
  fulfilled_quantity: Scalars['Int']['output'];
  raw_fulfilled_quantity: Maybe<Scalars['JSON']['output']>;
  shipped_quantity: Scalars['Int']['output'];
  raw_shipped_quantity: Maybe<Scalars['JSON']['output']>;
  return_requested_quantity: Scalars['Int']['output'];
  raw_return_requested_quantity: Maybe<Scalars['JSON']['output']>;
  return_received_quantity: Scalars['Int']['output'];
  raw_return_received_quantity: Maybe<Scalars['JSON']['output']>;
  return_dismissed_quantity: Scalars['Int']['output'];
  raw_return_dismissed_quantity: Maybe<Scalars['JSON']['output']>;
  written_off_quantity: Scalars['Int']['output'];
  raw_written_off_quantity: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
};

export type OrderStatus =
  | 'pending'
  | 'completed'
  | 'draft'
  | 'archived'
  | 'canceled'
  | 'requires_action';

export type Order = {
  __typename?: 'Order';
  id: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
  order_change: Maybe<OrderChange>;
  status: OrderStatus;
  region_id: Maybe<Scalars['String']['output']>;
  customer_id: Maybe<Scalars['String']['output']>;
  display_id: Maybe<Scalars['String']['output']>;
  custom_display_id: Maybe<Scalars['String']['output']>;
  sales_channel_id: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  currency_code: Scalars['String']['output'];
  shipping_address: Maybe<OrderAddress>;
  billing_address: Maybe<OrderAddress>;
  items: Maybe<Array<Maybe<OrderLineItem>>>;
  shipping_methods: Maybe<Array<Maybe<OrderShippingMethod>>>;
  transactions: Maybe<Array<Maybe<OrderTransaction>>>;
  summary: Maybe<OrderSummary>;
  metadata: Maybe<Scalars['JSON']['output']>;
  canceled_at: Maybe<Scalars['DateTime']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  original_item_total: Scalars['Float']['output'];
  original_item_subtotal: Scalars['Float']['output'];
  original_item_tax_total: Scalars['Float']['output'];
  item_total: Scalars['Float']['output'];
  item_subtotal: Scalars['Float']['output'];
  item_tax_total: Scalars['Float']['output'];
  original_total: Scalars['Float']['output'];
  original_subtotal: Scalars['Float']['output'];
  original_tax_total: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
  subtotal: Scalars['Float']['output'];
  tax_total: Scalars['Float']['output'];
  discount_total: Scalars['Float']['output'];
  discount_tax_total: Scalars['Float']['output'];
  gift_card_total: Scalars['Float']['output'];
  gift_card_tax_total: Scalars['Float']['output'];
  shipping_total: Scalars['Float']['output'];
  shipping_subtotal: Scalars['Float']['output'];
  shipping_tax_total: Scalars['Float']['output'];
  original_shipping_total: Scalars['Float']['output'];
  original_shipping_subtotal: Scalars['Float']['output'];
  original_shipping_tax_total: Scalars['Float']['output'];
  raw_original_item_total: Maybe<Scalars['JSON']['output']>;
  raw_original_item_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_item_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_item_total: Maybe<Scalars['JSON']['output']>;
  raw_item_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_item_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_original_total: Maybe<Scalars['JSON']['output']>;
  raw_original_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_gift_card_total: Maybe<Scalars['JSON']['output']>;
  raw_gift_card_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_shipping_total: Maybe<Scalars['JSON']['output']>;
  raw_shipping_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_shipping_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_total: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_tax_total: Maybe<Scalars['JSON']['output']>;
  cart_link: Maybe<LinkOrderCart>;
  cart: Maybe<Cart>;
  fulfillment_link: Maybe<Array<Maybe<LinkOrderFulfillment>>>;
  fulfillments: Maybe<Array<Maybe<Fulfillment>>>;
  payment_collections_link: Maybe<LinkOrderPaymentCollection>;
  payment_collections: Maybe<Array<Maybe<PaymentCollection>>>;
  promotion_link: Maybe<Array<Maybe<LinkOrderPromotion>>>;
  promotions: Maybe<Array<Maybe<Promotion>>>;
  promotion: Maybe<Array<Maybe<Promotion>>>;
  customer: Maybe<Customer>;
  region: Maybe<Region>;
  sales_channel: Maybe<SalesChannel>;
  order_group_link: Maybe<LinkOrderGroupOrder>;
  order_group: Maybe<OrderGroup>;
  payout_link: Maybe<Array<Maybe<LinkOrderOrderPayoutPayout>>>;
  payouts: Maybe<Array<Maybe<Payout>>>;
  seller_link: Maybe<LinkOrderOrderSellerSeller>;
  seller: Maybe<Seller>;
};

export type ReturnStatus =
  | 'requested'
  | 'received'
  | 'partially_received'
  | 'canceled';

export type Return = {
  __typename?: 'Return';
  id: Scalars['ID']['output'];
  status: ReturnStatus;
  refund_amount: Maybe<Scalars['Float']['output']>;
  order_id: Scalars['String']['output'];
  items: Array<Maybe<OrderReturnItem>>;
  return_fulfillment_link: Maybe<Array<Maybe<LinkReturnFulfillment>>>;
  fulfillments: Maybe<Array<Maybe<Fulfillment>>>;
  customer_refund_method_link: Maybe<Array<Maybe<LinkReturnRefundMethod>>>;
  customer_refund_methods: Maybe<Array<Maybe<CustomerRefundMethod>>>;
};

export type OrderReturnItem = {
  __typename?: 'OrderReturnItem';
  id: Scalars['ID']['output'];
  return_id: Scalars['String']['output'];
  order_id: Scalars['String']['output'];
  item_id: Scalars['String']['output'];
  reason_id: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
  raw_quantity: Maybe<Scalars['JSON']['output']>;
  received_quantity: Maybe<Scalars['Int']['output']>;
  raw_received_quantity: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
};

export type OrderClaimItem = {
  __typename?: 'OrderClaimItem';
  id: Scalars['ID']['output'];
  claim_id: Scalars['String']['output'];
  order_id: Scalars['String']['output'];
  item_id: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  images: Maybe<Array<Maybe<OrderClaimItemImage>>>;
  raw_quantity: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
};

export type OrderClaimItemImage = {
  __typename?: 'OrderClaimItemImage';
  id: Scalars['ID']['output'];
  claim_item_id: Scalars['String']['output'];
  item: OrderClaimItem;
  url: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
};

export type OrderExchangeItem = {
  __typename?: 'OrderExchangeItem';
  id: Scalars['ID']['output'];
  exchange_id: Scalars['String']['output'];
  order_id: Scalars['String']['output'];
  item_id: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  raw_quantity: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
};

export type OrderClaim = {
  __typename?: 'OrderClaim';
  order_id: Scalars['String']['output'];
  claim_items: Array<Maybe<OrderClaimItem>>;
  additional_items: Array<Maybe<OrderClaimItem>>;
  return: Maybe<Return>;
  return_id: Maybe<Scalars['String']['output']>;
  no_notification: Maybe<Scalars['Boolean']['output']>;
  refund_amount: Maybe<Scalars['Float']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
};

export type OrderExchange = {
  __typename?: 'OrderExchange';
  order_id: Scalars['String']['output'];
  return_items: Array<Maybe<OrderReturnItem>>;
  additional_items: Array<Maybe<OrderExchangeItem>>;
  no_notification: Maybe<Scalars['Boolean']['output']>;
  difference_due: Maybe<Scalars['Float']['output']>;
  return: Maybe<Return>;
  return_id: Maybe<Scalars['String']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
};

export type PaymentStatus =
  | 'not_paid'
  | 'awaiting'
  | 'authorized'
  | 'partially_authorized'
  | 'captured'
  | 'partially_captured'
  | 'partially_refunded'
  | 'refunded'
  | 'canceled'
  | 'requires_action';

export type FulfillmentStatus =
  | 'not_fulfilled'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'partially_shipped'
  | 'shipped'
  | 'partially_delivered'
  | 'delivered'
  | 'canceled';

export type OrderDetail = {
  __typename?: 'OrderDetail';
  id: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
  order_change: Maybe<OrderChange>;
  status: OrderStatus;
  region_id: Maybe<Scalars['String']['output']>;
  customer_id: Maybe<Scalars['String']['output']>;
  sales_channel_id: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  currency_code: Scalars['String']['output'];
  shipping_address: Maybe<OrderAddress>;
  billing_address: Maybe<OrderAddress>;
  items: Maybe<Array<Maybe<OrderLineItem>>>;
  shipping_methods: Maybe<Array<Maybe<OrderShippingMethod>>>;
  transactions: Maybe<Array<Maybe<OrderTransaction>>>;
  summary: Maybe<OrderSummary>;
  metadata: Maybe<Scalars['JSON']['output']>;
  canceled_at: Maybe<Scalars['DateTime']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  original_item_total: Scalars['Float']['output'];
  original_item_subtotal: Scalars['Float']['output'];
  original_item_tax_total: Scalars['Float']['output'];
  item_total: Scalars['Float']['output'];
  item_subtotal: Scalars['Float']['output'];
  item_tax_total: Scalars['Float']['output'];
  original_total: Scalars['Float']['output'];
  original_subtotal: Scalars['Float']['output'];
  original_tax_total: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
  subtotal: Scalars['Float']['output'];
  tax_total: Scalars['Float']['output'];
  discount_total: Scalars['Float']['output'];
  discount_tax_total: Scalars['Float']['output'];
  gift_card_total: Scalars['Float']['output'];
  gift_card_tax_total: Scalars['Float']['output'];
  shipping_total: Scalars['Float']['output'];
  shipping_subtotal: Scalars['Float']['output'];
  shipping_tax_total: Scalars['Float']['output'];
  original_shipping_total: Scalars['Float']['output'];
  original_shipping_subtotal: Scalars['Float']['output'];
  original_shipping_tax_total: Scalars['Float']['output'];
  raw_original_item_total: Maybe<Scalars['JSON']['output']>;
  raw_original_item_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_item_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_item_total: Maybe<Scalars['JSON']['output']>;
  raw_item_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_item_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_original_total: Maybe<Scalars['JSON']['output']>;
  raw_original_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_gift_card_total: Maybe<Scalars['JSON']['output']>;
  raw_gift_card_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_shipping_total: Maybe<Scalars['JSON']['output']>;
  raw_shipping_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_shipping_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_total: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_tax_total: Maybe<Scalars['JSON']['output']>;
  payment_collections: Maybe<Array<Maybe<PaymentCollection>>>;
  payment_status: PaymentStatus;
  fulfillments: Maybe<Array<Maybe<Fulfillment>>>;
  fulfillment_status: FulfillmentStatus;
};

export type OrderChange = {
  __typename?: 'OrderChange';
  id: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
  change_type: Maybe<Scalars['String']['output']>;
  order_id: Scalars['String']['output'];
  return_id: Maybe<Scalars['String']['output']>;
  exchange_id: Maybe<Scalars['String']['output']>;
  claim_id: Maybe<Scalars['String']['output']>;
  order: Order;
  return_order: Maybe<Return>;
  exchange: Maybe<OrderExchange>;
  claim: Maybe<OrderClaim>;
  actions: Array<Maybe<OrderChangeAction>>;
  status: Scalars['String']['output'];
  requested_by: Maybe<Scalars['String']['output']>;
  requested_at: Maybe<Scalars['DateTime']['output']>;
  confirmed_by: Maybe<Scalars['String']['output']>;
  confirmed_at: Maybe<Scalars['DateTime']['output']>;
  declined_by: Maybe<Scalars['String']['output']>;
  declined_reason: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  declined_at: Maybe<Scalars['DateTime']['output']>;
  canceled_by: Maybe<Scalars['String']['output']>;
  canceled_at: Maybe<Scalars['DateTime']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
};

export type OrderChangeAction = {
  __typename?: 'OrderChangeAction';
  id: Scalars['ID']['output'];
  order_change_id: Maybe<Scalars['String']['output']>;
  order_change: Maybe<OrderChange>;
  order_id: Maybe<Scalars['String']['output']>;
  return_id: Maybe<Scalars['String']['output']>;
  claim_id: Maybe<Scalars['String']['output']>;
  exchange_id: Maybe<Scalars['String']['output']>;
  order: Maybe<Order>;
  reference: Scalars['String']['output'];
  reference_id: Scalars['String']['output'];
  action: ChangeActionType;
  details: Maybe<Scalars['JSON']['output']>;
  internal_note: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
};

export type OrderTransaction = {
  __typename?: 'OrderTransaction';
  id: Scalars['ID']['output'];
  order_id: Scalars['String']['output'];
  order: Order;
  amount: Scalars['Float']['output'];
  raw_amount: Maybe<Scalars['JSON']['output']>;
  currency_code: Scalars['String']['output'];
  reference: Scalars['String']['output'];
  reference_id: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
};

export type ViewConfiguration = {
  __typename?: 'ViewConfiguration';
  id: Scalars['ID']['output'];
  entity: Scalars['String']['output'];
  name: Maybe<Scalars['String']['output']>;
  user_id: Maybe<Scalars['String']['output']>;
  is_system_default: Scalars['Boolean']['output'];
  configuration: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type UserPreference = {
  __typename?: 'UserPreference';
  id: Scalars['ID']['output'];
  user_id: Scalars['String']['output'];
  key: Scalars['String']['output'];
  value: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type User = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  first_name: Maybe<Scalars['String']['output']>;
  last_name: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  avatar_url: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Invite = {
  __typename?: 'Invite';
  id: Scalars['ID']['output'];
  email: Scalars['String']['output'];
  accepted: Scalars['Boolean']['output'];
  token: Scalars['String']['output'];
  expires_at: Scalars['DateTime']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type WorkflowExecutionStateEnum =
  | 'not_started'
  | 'invoking'
  | 'waiting_to_compensate'
  | 'compensating'
  | 'done'
  | 'reverted'
  | 'failed';

export type WorkflowExecution = {
  __typename?: 'WorkflowExecution';
  id: Scalars['ID']['output'];
  workflow_id: Scalars['ID']['output'];
  transaction_id: Scalars['ID']['output'];
  run_id: Scalars['ID']['output'];
  execution: Maybe<Scalars['JSON']['output']>;
  context: Maybe<Scalars['JSON']['output']>;
  state: WorkflowExecutionStateEnum;
  retention_time: Maybe<Scalars['Int']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type GeoZoneType =
  | 'country'
  | 'province'
  | 'city'
  | 'zip';

export type ShippingOptionPriceType =
  | 'calculated'
  | 'flat';

export type FulfillmentItem = {
  __typename?: 'FulfillmentItem';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  sku: Scalars['String']['output'];
  barcode: Scalars['String']['output'];
  line_item_id: Maybe<Scalars['String']['output']>;
  inventory_item_id: Maybe<Scalars['String']['output']>;
  fulfillment_id: Scalars['String']['output'];
  fulfillment: Fulfillment;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type FulfillmentLabel = {
  __typename?: 'FulfillmentLabel';
  id: Scalars['ID']['output'];
  tracking_number: Scalars['String']['output'];
  tracking_url: Scalars['String']['output'];
  label_url: Scalars['String']['output'];
  fulfillment_id: Scalars['String']['output'];
  fulfillment: Fulfillment;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type FulfillmentProvider = {
  __typename?: 'FulfillmentProvider';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  locations_link: Maybe<Array<Maybe<LinkLocationFulfillmentProvider>>>;
  locations: Maybe<Array<Maybe<StockLocation>>>;
};

export type FulfillmentSet = {
  __typename?: 'FulfillmentSet';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  service_zones: Array<ServiceZone>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  locations_link: Maybe<LinkLocationFulfillmentSet>;
  location: Maybe<StockLocation>;
  seller_link: Maybe<LinkSellerSellerFulfillmentFulfillmentSet>;
  seller: Maybe<Seller>;
};

export type Fulfillment = {
  __typename?: 'Fulfillment';
  id: Scalars['ID']['output'];
  location_id: Scalars['String']['output'];
  packed_at: Maybe<Scalars['DateTime']['output']>;
  shipped_at: Maybe<Scalars['DateTime']['output']>;
  delivered_at: Maybe<Scalars['DateTime']['output']>;
  canceled_at: Maybe<Scalars['DateTime']['output']>;
  marked_shipped_by: Maybe<Scalars['String']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  data: Maybe<Scalars['JSON']['output']>;
  provider_id: Scalars['String']['output'];
  shipping_option_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  shipping_option: Maybe<ShippingOption>;
  provider: FulfillmentProvider;
  items: Array<FulfillmentItem>;
  labels: Array<FulfillmentLabel>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  order_link: Maybe<LinkOrderFulfillment>;
  order: Maybe<Order>;
  return_link: Maybe<LinkReturnFulfillment>;
};

export type GeoZone = {
  __typename?: 'GeoZone';
  id: Scalars['ID']['output'];
  type: GeoZoneType;
  country_code: Scalars['String']['output'];
  province_code: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  postal_expression: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ServiceZone = {
  __typename?: 'ServiceZone';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  fulfillment_set: FulfillmentSet;
  fulfillment_set_id: Scalars['String']['output'];
  geo_zones: Array<GeoZone>;
  shipping_options: Array<ShippingOption>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  seller_link: Maybe<LinkSellerSellerFulfillmentServiceZone>;
  seller: Maybe<Seller>;
};

export type ShippingOptionRule = {
  __typename?: 'ShippingOptionRule';
  id: Scalars['ID']['output'];
  attribute: Scalars['String']['output'];
  operator: Scalars['String']['output'];
  value: Maybe<Scalars['JSON']['output']>;
  shipping_option_id: Scalars['String']['output'];
  shipping_option: ShippingOption;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShippingOptionType = {
  __typename?: 'ShippingOptionType';
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  description: Scalars['String']['output'];
  code: Scalars['String']['output'];
  shipping_option_id: Scalars['String']['output'];
  shipping_option: ShippingOption;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShippingOption = {
  __typename?: 'ShippingOption';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  price_type: ShippingOptionPriceType;
  service_zone_id: Scalars['String']['output'];
  shipping_profile_id: Scalars['String']['output'];
  provider_id: Scalars['String']['output'];
  shipping_option_type_id: Maybe<Scalars['String']['output']>;
  data: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  service_zone: ServiceZone;
  shipping_profile: ShippingProfile;
  fulfillment_provider: FulfillmentProvider;
  type: ShippingOptionType;
  rules: Array<ShippingOptionRule>;
  fulfillments: Array<Fulfillment>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  price_set_link: Maybe<LinkShippingOptionPriceSet>;
  seller_link: Maybe<LinkFulfillmentShippingOptionSellerSeller>;
  seller: Maybe<Seller>;
};

export type ShippingProfile = {
  __typename?: 'ShippingProfile';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  shipping_options: Array<ShippingOption>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  products_link: Maybe<Array<Maybe<LinkProductShippingProfile>>>;
  seller_link: Maybe<LinkFulfillmentShippingProfileSellerSeller>;
  seller: Maybe<Seller>;
};

export type AuthIdentity = {
  __typename?: 'AuthIdentity';
  id: Scalars['ID']['output'];
  provider_identities: Array<Maybe<ProviderIdentity>>;
  app_metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ProviderIdentity = {
  __typename?: 'ProviderIdentity';
  id: Scalars['ID']['output'];
  entity_id: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  auth_identity_id: Scalars['String']['output'];
  auth_identity: AuthIdentity;
  user_metadata: Maybe<Scalars['JSON']['output']>;
  provider_metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type NotificationStatusEnum =
  | 'pending'
  | 'success'
  | 'failure';

export type Notification = {
  __typename?: 'Notification';
  id: Scalars['ID']['output'];
  to: Scalars['String']['output'];
  from: Maybe<Scalars['String']['output']>;
  channel: Scalars['String']['output'];
  template: Maybe<Scalars['String']['output']>;
  data: Maybe<Scalars['JSON']['output']>;
  provider_data: Maybe<Scalars['JSON']['output']>;
  trigger_type: Maybe<Scalars['String']['output']>;
  resource_id: Maybe<Scalars['String']['output']>;
  resource_type: Maybe<Scalars['String']['output']>;
  receiver_id: Maybe<Scalars['String']['output']>;
  original_notification_id: Maybe<Scalars['String']['output']>;
  idempotency_key: Maybe<Scalars['String']['output']>;
  external_id: Maybe<Scalars['String']['output']>;
  status: NotificationStatusEnum;
  provider_id: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type LinkCartPaymentCollection = {
  __typename?: 'LinkCartPaymentCollection';
  cart_id: Scalars['String']['output'];
  payment_collection_id: Scalars['String']['output'];
  cart: Maybe<Cart>;
  payment_collection: Maybe<PaymentCollection>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkCartPromotion = {
  __typename?: 'LinkCartPromotion';
  cart_id: Scalars['String']['output'];
  promotion_id: Scalars['String']['output'];
  cart: Maybe<Cart>;
  promotions: Maybe<Promotion>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkCustomerAccountHolder = {
  __typename?: 'LinkCustomerAccountHolder';
  customer_id: Scalars['String']['output'];
  account_holder_id: Scalars['String']['output'];
  customer: Maybe<Customer>;
  account_holder: Maybe<AccountHolder>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkLocationFulfillmentProvider = {
  __typename?: 'LinkLocationFulfillmentProvider';
  stock_location_id: Scalars['String']['output'];
  fulfillment_provider_id: Scalars['String']['output'];
  location: Maybe<StockLocation>;
  fulfillment_provider: Maybe<FulfillmentProvider>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkLocationFulfillmentSet = {
  __typename?: 'LinkLocationFulfillmentSet';
  stock_location_id: Scalars['String']['output'];
  fulfillment_set_id: Scalars['String']['output'];
  location: Maybe<StockLocation>;
  fulfillment_set: Maybe<FulfillmentSet>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkOrderCart = {
  __typename?: 'LinkOrderCart';
  order_id: Scalars['String']['output'];
  cart_id: Scalars['String']['output'];
  order: Maybe<Order>;
  cart: Maybe<Cart>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkOrderFulfillment = {
  __typename?: 'LinkOrderFulfillment';
  order_id: Scalars['String']['output'];
  fulfillment_id: Scalars['String']['output'];
  order: Maybe<Order>;
  fulfillments: Maybe<Fulfillment>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkOrderPaymentCollection = {
  __typename?: 'LinkOrderPaymentCollection';
  order_id: Scalars['String']['output'];
  payment_collection_id: Scalars['String']['output'];
  order: Maybe<Order>;
  payment_collection: Maybe<PaymentCollection>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkOrderPromotion = {
  __typename?: 'LinkOrderPromotion';
  order_id: Scalars['String']['output'];
  promotion_id: Scalars['String']['output'];
  order: Maybe<Order>;
  promotions: Maybe<Promotion>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkReturnFulfillment = {
  __typename?: 'LinkReturnFulfillment';
  return_id: Scalars['String']['output'];
  fulfillment_id: Scalars['String']['output'];
  return: Maybe<Return>;
  fulfillments: Maybe<Fulfillment>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductSalesChannel = {
  __typename?: 'LinkProductSalesChannel';
  product_id: Scalars['String']['output'];
  sales_channel_id: Scalars['String']['output'];
  product: Maybe<Product>;
  sales_channel: Maybe<SalesChannel>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductShippingProfile = {
  __typename?: 'LinkProductShippingProfile';
  product_id: Scalars['String']['output'];
  shipping_profile_id: Scalars['String']['output'];
  product: Maybe<Product>;
  shipping_profile: Maybe<ShippingProfile>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductVariantInventoryItem = {
  __typename?: 'LinkProductVariantInventoryItem';
  variant_id: Scalars['String']['output'];
  inventory_item_id: Scalars['String']['output'];
  required_quantity: Scalars['Int']['output'];
  variant: Maybe<ProductVariant>;
  inventory: Maybe<InventoryItem>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductVariantPriceSet = {
  __typename?: 'LinkProductVariantPriceSet';
  variant_id: Scalars['String']['output'];
  price_set_id: Scalars['String']['output'];
  variant: Maybe<ProductVariant>;
  price_set: Maybe<PriceSet>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkPublishableApiKeySalesChannel = {
  __typename?: 'LinkPublishableApiKeySalesChannel';
  publishable_key_id: Scalars['String']['output'];
  sales_channel_id: Scalars['String']['output'];
  api_key: Maybe<ApiKey>;
  sales_channel: Maybe<SalesChannel>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkRegionPaymentProvider = {
  __typename?: 'LinkRegionPaymentProvider';
  region_id: Scalars['String']['output'];
  payment_provider_id: Scalars['String']['output'];
  region: Maybe<Region>;
  payment_provider: Maybe<PaymentProvider>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkSalesChannelStockLocation = {
  __typename?: 'LinkSalesChannelStockLocation';
  sales_channel_id: Scalars['String']['output'];
  stock_location_id: Scalars['String']['output'];
  sales_channel: Maybe<SalesChannel>;
  location: Maybe<StockLocation>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkShippingOptionPriceSet = {
  __typename?: 'LinkShippingOptionPriceSet';
  shipping_option_id: Scalars['String']['output'];
  price_set_id: Scalars['String']['output'];
  shipping_option: Maybe<ShippingOption>;
  price_set: Maybe<PriceSet>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductProductCategoryAttributeAttribute = {
  __typename?: 'LinkProductProductCategoryAttributeAttribute';
  product_category_id: Scalars['String']['output'];
  attribute_id: Scalars['String']['output'];
  product_category: Maybe<ProductCategory>;
  attribute: Maybe<Attribute>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkCustomerCustomerCustomerBankDetailCustomerBankDetail = {
  __typename?: 'LinkCustomerCustomerCustomerBankDetailCustomerBankDetail';
  customer_id: Scalars['String']['output'];
  customer_bank_detail_id: Scalars['String']['output'];
  customer: Maybe<Customer>;
  customer_bank_detail: Maybe<CustomerBankDetail>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkCustomerCustomerCustomerUpiDetailCustomerUpiDetail = {
  __typename?: 'LinkCustomerCustomerCustomerUpiDetailCustomerUpiDetail';
  customer_id: Scalars['String']['output'];
  customer_upi_detail_id: Scalars['String']['output'];
  customer: Maybe<Customer>;
  customer_upi_detail: Maybe<CustomerUpiDetail>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkCustomerCustomerWishlistWishlist = {
  __typename?: 'LinkCustomerCustomerWishlistWishlist';
  customer_id: Scalars['String']['output'];
  wishlist_id: Scalars['String']['output'];
  customer: Maybe<Customer>;
  wishlist: Maybe<Wishlist>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkPricingPriceExtendPriceExtendPrice = {
  __typename?: 'LinkPricingPriceExtendPriceExtendPrice';
  price_id: Scalars['String']['output'];
  extend_price_id: Scalars['String']['output'];
  price: Maybe<Price>;
  extend_price: Maybe<ExtendPrice>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductProductAttributeAttributeValue = {
  __typename?: 'LinkProductProductAttributeAttributeValue';
  product_id: Scalars['String']['output'];
  attribute_value_id: Scalars['String']['output'];
  product: Maybe<Product>;
  attribute_value: Maybe<AttributeValue>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductProductBrandBrand = {
  __typename?: 'LinkProductProductBrandBrand';
  product_id: Scalars['String']['output'];
  brand_id: Scalars['String']['output'];
  product: Maybe<Product>;
  brand: Maybe<Brand>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkPromotionPromotionExtension = {
  __typename?: 'LinkPromotionPromotionExtension';
  promotion_id: Scalars['String']['output'];
  promotion_extension_id: Scalars['String']['output'];
  promotion: Maybe<Promotion>;
  promotion_extension: Maybe<PromotionExtension>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkPaymentRefundReasonRefundCategoryRefundCategory = {
  __typename?: 'LinkPaymentRefundReasonRefundCategoryRefundCategory';
  refund_reason_id: Scalars['String']['output'];
  refund_category_id: Scalars['String']['output'];
  refund_reason: Maybe<RefundReason>;
  refund_category: Maybe<RefundCategory>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkReturnRefundMethod = {
  __typename?: 'LinkReturnRefundMethod';
  return_id: Scalars['String']['output'];
  customer_refund_method_id: Scalars['String']['output'];
  return: Maybe<Return>;
  customer_refund_method: Maybe<CustomerRefundMethod>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkSellerSellerBrandBrand = {
  __typename?: 'LinkSellerSellerBrandBrand';
  seller_id: Scalars['String']['output'];
  brand_id: Scalars['String']['output'];
  seller: Maybe<Seller>;
  brand: Maybe<Brand>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkStockLocSectionContactLink = {
  __typename?: 'LinkStockLocSectionContactLink';
  stock_location_section_id: Scalars['String']['output'];
  stock_location_contact_id: Scalars['String']['output'];
  stock_location_section: Maybe<StockLocationSection>;
  stock_location_contact: Maybe<StockLocationContact>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkStockLocSectionDocumentLink = {
  __typename?: 'LinkStockLocSectionDocumentLink';
  stock_location_section_id: Scalars['String']['output'];
  stock_location_document_id: Scalars['String']['output'];
  stock_location_section: Maybe<StockLocationSection>;
  stock_location_document: Maybe<StockLocationDocument>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkStockLocationStockLocationExtension = {
  __typename?: 'LinkStockLocationStockLocationExtension';
  stock_location_id: Scalars['String']['output'];
  stock_location_extension_id: Scalars['String']['output'];
  stock_location: Maybe<StockLocation>;
  stock_location_extension: Maybe<StockLocationExtension>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkStockLocationStockLocationSection = {
  __typename?: 'LinkStockLocationStockLocationSection';
  stock_location_id: Scalars['String']['output'];
  stock_location_section_id: Scalars['String']['output'];
  stock_location: Maybe<StockLocation>;
  stock_location_section: Maybe<StockLocationSection>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkTierTierCustomerCustomer = {
  __typename?: 'LinkTierTierCustomerCustomer';
  tier_id: Scalars['String']['output'];
  customer_id: Scalars['String']['output'];
  tier: Maybe<Tier>;
  customer: Maybe<Customer>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkWishlistWishlistProductProduct = {
  __typename?: 'LinkWishlistWishlistProductProduct';
  wishlist_id: Scalars['String']['output'];
  product_id: Scalars['String']['output'];
  wishlist: Maybe<Wishlist>;
  product: Maybe<Product>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkPromotionCampaignSellerSeller = {
  __typename?: 'LinkPromotionCampaignSellerSeller';
  campaign_id: Scalars['String']['output'];
  seller_id: Scalars['String']['output'];
  campaign: Maybe<Campaign>;
  seller: Maybe<Seller>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkSellerSellerFulfillmentFulfillmentSet = {
  __typename?: 'LinkSellerSellerFulfillmentFulfillmentSet';
  seller_id: Scalars['String']['output'];
  fulfillment_set_id: Scalars['String']['output'];
  seller: Maybe<Seller>;
  fulfillment_set: Maybe<FulfillmentSet>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkInventoryInventoryItemSellerSeller = {
  __typename?: 'LinkInventoryInventoryItemSellerSeller';
  inventory_item_id: Scalars['String']['output'];
  seller_id: Scalars['String']['output'];
  inventory_item: Maybe<InventoryItem>;
  seller: Maybe<Seller>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkOrderGroupOrder = {
  __typename?: 'LinkOrderGroupOrder';
  order_group_id: Scalars['String']['output'];
  order_id: Scalars['String']['output'];
  order_group: Maybe<OrderGroup>;
  order: Maybe<Order>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkOrderOrderPayoutPayout = {
  __typename?: 'LinkOrderOrderPayoutPayout';
  order_id: Scalars['String']['output'];
  payout_id: Scalars['String']['output'];
  order: Maybe<Order>;
  payout: Maybe<Payout>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkOrderOrderSellerSeller = {
  __typename?: 'LinkOrderOrderSellerSeller';
  order_id: Scalars['String']['output'];
  seller_id: Scalars['String']['output'];
  order: Maybe<Order>;
  seller: Maybe<Seller>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkPayoutPayoutSellerSeller = {
  __typename?: 'LinkPayoutPayoutSellerSeller';
  payout_id: Scalars['String']['output'];
  seller_id: Scalars['String']['output'];
  payout: Maybe<Payout>;
  seller: Maybe<Seller>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkPricingPriceListSellerSeller = {
  __typename?: 'LinkPricingPriceListSellerSeller';
  price_list_id: Scalars['String']['output'];
  seller_id: Scalars['String']['output'];
  price_list: Maybe<PriceList>;
  seller: Maybe<Seller>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductProductSellerSeller = {
  __typename?: 'LinkProductProductSellerSeller';
  product_id: Scalars['String']['output'];
  seller_id: Scalars['String']['output'];
  product: Maybe<Product>;
  seller: Maybe<Seller>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkPromotionPromotionSellerSeller = {
  __typename?: 'LinkPromotionPromotionSellerSeller';
  promotion_id: Scalars['String']['output'];
  seller_id: Scalars['String']['output'];
  promotion: Maybe<Promotion>;
  seller: Maybe<Seller>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkSellerSellerCustomerCustomer = {
  __typename?: 'LinkSellerSellerCustomerCustomer';
  seller_id: Scalars['String']['output'];
  customer_id: Scalars['String']['output'];
  seller: Maybe<Seller>;
  customer: Maybe<Customer>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkSellerSellerPayoutPayoutAccount = {
  __typename?: 'LinkSellerSellerPayoutPayoutAccount';
  seller_id: Scalars['String']['output'];
  payout_account_id: Scalars['String']['output'];
  seller: Maybe<Seller>;
  payout_account: Maybe<PayoutAccount>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkSellerSellerFulfillmentServiceZone = {
  __typename?: 'LinkSellerSellerFulfillmentServiceZone';
  seller_id: Scalars['String']['output'];
  service_zone_id: Scalars['String']['output'];
  seller: Maybe<Seller>;
  service_zone: Maybe<ServiceZone>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkFulfillmentShippingOptionSellerSeller = {
  __typename?: 'LinkFulfillmentShippingOptionSellerSeller';
  shipping_option_id: Scalars['String']['output'];
  seller_id: Scalars['String']['output'];
  shipping_option: Maybe<ShippingOption>;
  seller: Maybe<Seller>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkFulfillmentShippingProfileSellerSeller = {
  __typename?: 'LinkFulfillmentShippingProfileSellerSeller';
  shipping_profile_id: Scalars['String']['output'];
  seller_id: Scalars['String']['output'];
  shipping_profile: Maybe<ShippingProfile>;
  seller: Maybe<Seller>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkStockLocationStockLocationSellerSeller = {
  __typename?: 'LinkStockLocationStockLocationSellerSeller';
  stock_location_id: Scalars['String']['output'];
  seller_id: Scalars['String']['output'];
  stock_location: Maybe<StockLocation>;
  seller: Maybe<Seller>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

declare module '@medusajs/framework/types' {
  interface RemoteQueryEntryPoints {
    commission_rate: CommissionRate
    commission_rates: CommissionRate
    commission_rule: CommissionRule
    commission_rules: CommissionRule
    commission_line: CommissionLine
    commission_lines: CommissionLine
    onboarding: Onboarding
    onboardings: Onboarding
    payout: Payout
    payouts: Payout
    payout_account: PayoutAccount
    payout_accounts: PayoutAccount
    order_group: OrderGroup
    order_groups: OrderGroup
    seller: Seller
    sellers: Seller
    moengage_alert: MoengageAlert
    moengage_alerts: MoengageAlert
    zone: Zone
    zones: Zone
    instant_promise: InstantPromise
    instant_promises: InstantPromise
    slot_definition: SlotDefinition
    slot_definitions: SlotDefinition
    slot_override: SlotOverride
    slot_overrides: SlotOverride
    stock_location_extension: StockLocationExtension
    stock_location_extensions: StockLocationExtension
    control: Control
    controls: Control
    brand: Brand
    brands: Brand
    attribute: Attribute
    attributes: Attribute
    attribute_value: AttributeValue
    attribute_values: AttributeValue
    attribute_possible_value: AttributePossibleValue
    attribute_possible_values: AttributePossibleValue
    system_config: SystemConfig
    system_configs: SystemConfig
    customer_bank_account_verification: CustomerBankAccountVerification
    customer_bank_account_verifications: CustomerBankAccountVerification
    customer_bank_detail: CustomerBankDetail
    customer_bank_details: CustomerBankDetail
    customer_upi_detail: CustomerUpiDetail
    customer_upi_details: CustomerUpiDetail
    extra_charge: ExtraCharge
    extra_charges: ExtraCharge
    extra_charge_rule: ExtraChargeRule
    extra_charge_rules: ExtraChargeRule
    cart_order_extra_charge: CartOrderExtraCharge
    cart_order_extra_charges: CartOrderExtraCharge
    customer_payment_preferences: CustomerPaymentPreferences
    customer_payment_preferences: CustomerPaymentPreferences
    customer_refund_method: CustomerRefundMethod
    customer_refund_methods: CustomerRefundMethod
    stock_location_section: StockLocationSection
    stock_location_sections: StockLocationSection
    stock_location_contact: StockLocationContact
    stock_location_contacts: StockLocationContact
    stock_location_document: StockLocationDocument
    stock_location_documents: StockLocationDocument
    location_hierarchy: LocationHierarchy
    location_hierarchies: LocationHierarchy
    config_image_resize_config_image_size: ConfigImageResizeConfigImageSize
    config_image_resize_config_image_sizes: ConfigImageResizeConfigImageSize
    config_image_resize_config: ConfigImageResizeConfig
    config_image_resize_configs: ConfigImageResizeConfig
    config_image_size: ConfigImageSize
    config_image_sizes: ConfigImageSize
    partner: Partner
    partners: Partner
    tier: Tier
    tiers: Tier
    tier_rule: TierRule
    tier_rules: TierRule
    variant_images_settings: VariantImagesSettings
    variant_images_settings: VariantImagesSettings
    video_encoding_jobs: VideoEncodingJobs
    video_encoding_jobs: VideoEncodingJobs
    wishlist: Wishlist
    wishlists: Wishlist
    extend_price: ExtendPrice
    extend_prices: ExtendPrice
    payout_transactions: PayoutTransactions
    payout_transactions: PayoutTransactions
    shopify_product_variant: ShopifyProductVariant
    shopify_product_variants: ShopifyProductVariant
    promotion_extension: PromotionExtension
    promotion_extensions: PromotionExtension
    return_refund_type_link: ReturnRefundTypeLink
    return_refund_type_links: ReturnRefundTypeLink
    refund_category: RefundCategory
    refund_categories: RefundCategory
    stock_location_address: StockLocationAddress
    stock_location_addresses: StockLocationAddress
    stock_location: StockLocation
    stock_locations: StockLocation
    inventory_items: InventoryItem
    inventory_item: InventoryItem
    inventory: InventoryItem
    reservation: ReservationItem
    reservations: ReservationItem
    reservation_item: ReservationItem
    reservation_items: ReservationItem
    inventory_level: InventoryLevel
    inventory_levels: InventoryLevel
    product_variant: ProductVariant
    product_variants: ProductVariant
    variant: ProductVariant
    variants: ProductVariant
    product: Product
    products: Product
    product_option: ProductOption
    product_options: ProductOption
    product_option_value: ProductOptionValue
    product_option_values: ProductOptionValue
    product_type: ProductType
    product_types: ProductType
    product_tag: ProductTag
    product_tags: ProductTag
    product_collection: ProductCollection
    product_collections: ProductCollection
    product_category: ProductCategory
    product_categories: ProductCategory
    product_image: ProductImage
    product_images: ProductImage
    price_set: PriceSet
    price_sets: PriceSet
    price_list: PriceList
    price_lists: PriceList
    price: Price
    prices: Price
    price_preference: PricePreference
    price_preferences: PricePreference
    promotion: Promotion
    promotions: Promotion
    application_method: ApplicationMethod
    application_methods: ApplicationMethod
    campaign: Campaign
    campaigns: Campaign
    campaign_budget: CampaignBudget
    campaign_budgets: CampaignBudget
    campaign_budget_usage: CampaignBudgetUsage
    campaign_budget_usages: CampaignBudgetUsage
    promotion_rule: PromotionRule
    promotion_rules: PromotionRule
    promotion_rule_value: PromotionRuleValue
    promotion_rule_values: PromotionRuleValue
    customer_address: CustomerAddress
    customer_addresses: CustomerAddress
    customer_group_customer: CustomerGroupCustomer
    customer_group_customers: CustomerGroupCustomer
    customer_group: CustomerGroup
    customer_groups: CustomerGroup
    customer: Customer
    customers: Customer
    sales_channel: SalesChannel
    sales_channels: SalesChannel
    cart: Cart
    carts: Cart
    credit_line: CreditLine
    credit_lines: CreditLine
    address: Address
    addresses: Address
    line_item: LineItem
    line_items: LineItem
    line_item_adjustment: LineItemAdjustment
    line_item_adjustments: LineItemAdjustment
    line_item_tax_line: LineItemTaxLine
    line_item_tax_lines: LineItemTaxLine
    shipping_method: ShippingMethod
    shipping_methods: ShippingMethod
    shipping_method_adjustment: ShippingMethodAdjustment
    shipping_method_adjustments: ShippingMethodAdjustment
    shipping_method_tax_line: ShippingMethodTaxLine
    shipping_method_tax_lines: ShippingMethodTaxLine
    region: Region
    regions: Region
    country: Country
    countries: Country
    api_key: ApiKey
    api_keys: ApiKey
    store: Store
    stores: Store
    store_currency: StoreCurrency
    store_currencies: StoreCurrency
    store_locale: StoreLocale
    store_locales: StoreLocale
    tax_rate: TaxRate
    tax_rates: TaxRate
    tax_region: TaxRegion
    tax_regions: TaxRegion
    tax_rate_rule: TaxRateRule
    tax_rate_rules: TaxRateRule
    tax_provider: TaxProvider
    tax_providers: TaxProvider
    currency: Currency
    currencies: Currency
    payment_method: any
    payment_methods: any
    account_holder: AccountHolder
    account_holders: AccountHolder
    capture: Capture
    captures: Capture
    payment_collection: PaymentCollection
    payment_collections: PaymentCollection
    payment_provider: PaymentProvider
    payment_providers: PaymentProvider
    payment_session: PaymentSession
    payment_sessions: PaymentSession
    payment: Payment
    payments: Payment
    refund_reason: RefundReason
    refund_reasons: RefundReason
    refund: Refund
    refunds: Refund
    order: Order
    orders: Order
    order_address: OrderAddress
    order_addresses: OrderAddress
    order_change: OrderChange
    order_changes: OrderChange
    order_claim: OrderClaim
    order_claims: OrderClaim
    order_exchange: OrderExchange
    order_exchanges: OrderExchange
    order_item: OrderItem
    order_items: OrderItem
    order_line_item: OrderLineItem
    order_line_items: OrderLineItem
    order_shipping_method: OrderShippingMethod
    order_shipping_methods: OrderShippingMethod
    order_transaction: OrderTransaction
    order_transactions: OrderTransaction
    return: Return
    returns: Return
    return_reason: any
    return_reasons: any
    view_configuration: ViewConfiguration
    view_configurations: ViewConfiguration
    user_preference: UserPreference
    user_preferences: UserPreference
    user: User
    users: User
    invite: Invite
    invites: Invite
    workflow_execution: WorkflowExecution
    workflow_executions: WorkflowExecution
    fulfillment_address: any
    fulfillment_addresses: any
    fulfillment_item: FulfillmentItem
    fulfillment_items: FulfillmentItem
    fulfillment_label: FulfillmentLabel
    fulfillment_labels: FulfillmentLabel
    fulfillment_provider: FulfillmentProvider
    fulfillment_providers: FulfillmentProvider
    fulfillment_set: FulfillmentSet
    fulfillment_sets: FulfillmentSet
    fulfillment: Fulfillment
    fulfillments: Fulfillment
    geo_zone: GeoZone
    geo_zones: GeoZone
    service_zone: ServiceZone
    service_zones: ServiceZone
    shipping_option_rule: ShippingOptionRule
    shipping_option_rules: ShippingOptionRule
    shipping_option_type: ShippingOptionType
    shipping_option_types: ShippingOptionType
    shipping_option: ShippingOption
    shipping_options: ShippingOption
    shipping_profile: ShippingProfile
    shipping_profiles: ShippingProfile
    file: any
    files: any
    auth_identity: AuthIdentity
    auth_identities: AuthIdentity
    provider_identity: ProviderIdentity
    provider_identities: ProviderIdentity
    notification: Notification
    notifications: Notification
    cart_payment_collection: LinkCartPaymentCollection
    cart_payment_collections: LinkCartPaymentCollection
    cart_promotion: LinkCartPromotion
    cart_promotions: LinkCartPromotion
    customer_account_holder: LinkCustomerAccountHolder
    customer_account_holders: LinkCustomerAccountHolder
    location_fulfillment_provider: LinkLocationFulfillmentProvider
    location_fulfillment_providers: LinkLocationFulfillmentProvider
    location_fulfillment_set: LinkLocationFulfillmentSet
    location_fulfillment_sets: LinkLocationFulfillmentSet
    order_cart: LinkOrderCart
    order_carts: LinkOrderCart
    order_fulfillment: LinkOrderFulfillment
    order_fulfillments: LinkOrderFulfillment
    order_payment_collection: LinkOrderPaymentCollection
    order_payment_collections: LinkOrderPaymentCollection
    order_promotion: LinkOrderPromotion
    order_promotions: LinkOrderPromotion
    return_fulfillment: LinkReturnFulfillment
    return_fulfillments: LinkReturnFulfillment
    product_sales_channel: LinkProductSalesChannel
    product_sales_channels: LinkProductSalesChannel
    product_shipping_profile: LinkProductShippingProfile
    product_shipping_profiles: LinkProductShippingProfile
    product_variant_inventory_item: LinkProductVariantInventoryItem
    product_variant_inventory_items: LinkProductVariantInventoryItem
    product_variant_price_set: LinkProductVariantPriceSet
    product_variant_price_sets: LinkProductVariantPriceSet
    publishable_api_key_sales_channel: LinkPublishableApiKeySalesChannel
    publishable_api_key_sales_channels: LinkPublishableApiKeySalesChannel
    region_payment_provider: LinkRegionPaymentProvider
    region_payment_providers: LinkRegionPaymentProvider
    sales_channel_location: LinkSalesChannelStockLocation
    sales_channel_locations: LinkSalesChannelStockLocation
    shipping_option_price_set: LinkShippingOptionPriceSet
    shipping_option_price_sets: LinkShippingOptionPriceSet
    product_category_attribute: LinkProductProductCategoryAttributeAttribute
    customer_customer_bank_detail: LinkCustomerCustomerCustomerBankDetailCustomerBankDetail
    customer_customer_upi_detail: LinkCustomerCustomerCustomerUpiDetailCustomerUpiDetail
    customer_wishlist: LinkCustomerCustomerWishlistWishlist
    price_extend_price: LinkPricingPriceExtendPriceExtendPrice
    product_attribute_value: LinkProductProductAttributeAttributeValue
    product_brand: LinkProductProductBrandBrand
    promotion_promotion_extension: LinkPromotionPromotionExtension
    refund_reason_refund_category: LinkPaymentRefundReasonRefundCategoryRefundCategory
    return_customer_refund_method: LinkReturnRefundMethod
    seller_brand: LinkSellerSellerBrandBrand
    stock_location_section_stock_location_contact: LinkStockLocSectionContactLink
    stock_location_section_stock_location_document: LinkStockLocSectionDocumentLink
    stock_location_stock_location_extension: LinkStockLocationStockLocationExtension
    stock_location_stock_location_section: LinkStockLocationStockLocationSection
    tier_customer: LinkTierTierCustomerCustomer
    wishlist_product: LinkWishlistWishlistProductProduct
    campaign_seller: LinkPromotionCampaignSellerSeller
    seller_fulfillment_set: LinkSellerSellerFulfillmentFulfillmentSet
    inventory_item_seller: LinkInventoryInventoryItemSellerSeller
    order_group_order: LinkOrderGroupOrder
    order_payout: LinkOrderOrderPayoutPayout
    order_seller: LinkOrderOrderSellerSeller
    payout_seller: LinkPayoutPayoutSellerSeller
    price_list_seller: LinkPricingPriceListSellerSeller
    product_seller: LinkProductProductSellerSeller
    promotion_seller: LinkPromotionPromotionSellerSeller
    seller_customer: LinkSellerSellerCustomerCustomer
    seller_payout_account: LinkSellerSellerPayoutPayoutAccount
    seller_service_zone: LinkSellerSellerFulfillmentServiceZone
    shipping_option_seller: LinkFulfillmentShippingOptionSellerSeller
    shipping_profile_seller: LinkFulfillmentShippingProfileSellerSeller
    stock_location_seller: LinkStockLocationStockLocationSellerSeller
  }
}