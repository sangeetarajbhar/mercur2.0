export const FIXED_PRICE_LIST_END_DATE = 60; // (in days)
/**
 * FIXED_PRICE_LIST_END_DATE is the maximum duration allowed for a price list validation. It is used to limit the maximum duration of the price list.
 * It is set to 60 days maximum duration from the start date. Price lists cannot exceed this duration.
*/
export const FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX = 90; // (in percentage)
/**
 * FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX is the maximum percentage discount value of the fixed price list validation. It is used to calculate the maximum percentage discount value of the fixed price list of original price.
 * It is set to 80% of original price. Not more than 80% of original price.
 */
export const NOT_ALLOWED_PRICE_VALUE = 0; // (in percentage)
/**
 * NOT_ALLOWED_PRICE_VALUE is the not allowed price value of the fixed price list validation. not allowed price value of the fixed price list of original price.
 */
export const SELLER_PRICE_LIST_ALLOW_ASAP_START_DATE = true; // (boolean)
/**
 * SELLER_PRICE_LIST_ALLOW_ASAP_START_DATE controls whether seller price-list imports allow "ASAP" (immediate) start dates or require "next day onwards" validation.
 * When set to true, seller imports allow start dates from the current date (ASAP).
 * When set to false, seller imports require start dates from next day onwards.
 * This flag only applies to seller price-list imports.
 */
