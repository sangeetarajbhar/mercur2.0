import { z } from "zod"

import { PriceListStatus, PriceListType } from "@medusajs/framework/utils"
import { validatePriceListDates } from "../../utils/price-list-validation"
import {
  FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX,
  NOT_ALLOWED_PRICE_VALUE,
  SELLER_PRICE_LIST_ALLOW_ASAP_START_DATE,
} from "../../../config/fixed-price-list"

export const VendorCreatePriceListPriceImport = z
  .object({
    currency_code: z.string(),
    amount: z.number().nullish().refine(
      (amount) => amount === null || amount === undefined || amount >= 0,
      { message: "Amount cannot be negative" }
    ),
    percentage_discount: z.number().nullish().refine(
      (percentage) =>
        percentage === null ||
        percentage === undefined ||
        (percentage >= NOT_ALLOWED_PRICE_VALUE &&
          percentage <= FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX),
      {
        message: `Percentage discount must be between ${NOT_ALLOWED_PRICE_VALUE} and ${FIXED_PERCENTAGE_DISCOUNT_VALUE_MAX}%`,
      }
    ),
    sku: z.string(),
    min_quantity: z.number().nullish(),
    max_quantity: z.number().nullish(),
    rules: z.record(z.string(), z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.amount !== null && data.amount !== undefined && data.amount < 0) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Amount cannot be negative",
            path: ["amount"],
          },
        ])
      }

      if (
        data.percentage_discount !== null &&
        data.percentage_discount !== undefined &&
        data.percentage_discount < 0
      ) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message: "Percentage discount cannot be negative",
            path: ["percentage_discount"],
          },
        ])
      }

      const hasValidAmount =
        data.amount !== null &&
        data.amount !== undefined &&
        data.amount > NOT_ALLOWED_PRICE_VALUE
      const hasValidPercentage =
        data.percentage_discount !== null &&
        data.percentage_discount !== undefined &&
        data.percentage_discount > NOT_ALLOWED_PRICE_VALUE
      const isPercentageMode =
        hasValidPercentage &&
        (data.amount === null || data.amount === undefined || data.amount === 0)

      if (!hasValidAmount && !isPercentageMode) {
        throw new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            message:
              "Either 'amount' must be greater than 0 OR 'percentage_discount' must be provided (amount can be 0 in this case)",
            path: ["amount", "percentage_discount"],
          },
        ])
      }

      return true
    },
    { message: "Invalid pricing configuration" }
  )

export const VendorCreatePriceListImport = z
  .object({
    title: z.string(),
    description: z.string(),
    starts_at: z.string().nullish(),
    ends_at: z.string().nullish(),
    status: z.nativeEnum(PriceListStatus).optional(),
    type: z.nativeEnum(PriceListType).optional(),
    rules: z.record(z.string(), z.array(z.string())).optional(),
    prices: z.array(VendorCreatePriceListPriceImport).optional(),
  })
  .refine(
    (data) => {
      if (data.starts_at && data.ends_at) {
        validatePriceListDates(
          data.starts_at,
          data.ends_at,
          SELLER_PRICE_LIST_ALLOW_ASAP_START_DATE
        )
      }
      return true
    },
    { message: "Invalid date range" }
  )
