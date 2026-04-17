import { MedusaError } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { parse } from "csv-parse/sync"
import { ZodError } from "zod"

import {
  VendorCreatePriceListImport,
  VendorCreatePriceListPriceImport,
} from "../../../api/vendor/price-list/validators"
import { formatDate, formatDateTime, removeFileExtension } from "../utils/utils"
import { formatZodError } from "../utils/error-formatter"

export type ParsePriceListCsvStepInput = {
  fileContent: string
  fileName: string
}

export const parsePriceListCsvStepId = "parse-price-list-csv"

function cleanDateString(str?: string) {
  return str
    ?.toString()
    .trim()
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .replace(/\uFEFF/g, "")
}

function safeToIso(input?: string): string | null {
  const cleaned = cleanDateString(input)
  if (!cleaned) return null

  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/
  const match = cleaned.match(ddmmyyyy)

  if (match) {
    const [, day, month, year] = match
    const isoLike = `${year}-${month}-${day}`
    const date = new Date(isoLike)
    return isNaN(date.getTime()) ? null : date.toISOString()
  }

  const date = new Date(cleaned)
  return isNaN(date.getTime()) ? null : date.toISOString()
}

export const parsePriceListCsvStep = createStep(
  parsePriceListCsvStepId,
  async (input: ParsePriceListCsvStepInput) => {
    let csvRows: Record<string, any>[] = []
    try {
      csvRows = parse(input.fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, any>[]

      csvRows = csvRows.map((row) => {
        const clean: Record<string, any> = {}
        for (const key of Object.keys(row)) {
          const cleanedKey = key
            .trim()
            .replace(/[\r\n]/g, "")
            .replace(/\uFEFF/g, "")
          if (cleanedKey && cleanedKey.length > 0) {
            clean[cleanedKey] = row[key]
          }
        }
        return clean
      })
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid CSV format: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    const listsMap = new Map<string, any>()

    for (const row of csvRows) {
      const startsAt = safeToIso(row["starts_at"])
      const endsAt = safeToIso(row["ends_at"])
      const listKey = `${startsAt ?? "empty start-date"}_${endsAt ?? "empty end-date"}`

      if (!listsMap.has(listKey)) {
        listsMap.set(listKey, {
          id: row["price_list_id"],
          title: `${removeFileExtension(input.fileName)} for ${
            formatDate(startsAt) ?? "N/A"
          } to ${formatDate(endsAt) ?? "N/A"}`,
          description: `Imported price list for ${
            formatDateTime(startsAt) ?? "start"
          } - ${formatDateTime(endsAt) ?? "end"}`,
          starts_at: startsAt,
          ends_at: endsAt,
          prices: [],
          status: "active",
        })
      }

      const listObj = listsMap.get(listKey)
      const sku = row["sku"] ? String(row["sku"]) : null
      const flatAmount = row["flat_amount"] ? Number(row["flat_amount"]) : null
      const discountPercentage = row["percentage_discount"]
        ? Number(row["percentage_discount"])
        : null

      if (!sku) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "SKU is required")
      }

      let amount: number | null = null
      if (flatAmount !== null && !isNaN(flatAmount)) amount = flatAmount
      if (discountPercentage !== null && !isNaN(discountPercentage)) amount = 0

      const price = {
        sku,
        currency_code: "inr",
        amount,
        percentage_discount: discountPercentage ?? null,
      }

      try {
        listObj.prices.push(VendorCreatePriceListPriceImport.parse(price))
      } catch (e) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid price entry in CSV for price list "${listKey}": ${e}`
        )
      }
    }

    const data: any[] = []
    for (const entry of listsMap.values()) {
      const payload = {
        title: entry.title,
        description: entry.description,
        starts_at: entry.starts_at,
        ends_at: entry.ends_at,
        prices: entry.prices,
        status: entry.status,
      }

      try {
        VendorCreatePriceListImport.parse(payload)
      } catch (e) {
        if (e instanceof ZodError) {
          const formattedMessage = formatZodError(e)
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Invalid price list data: ${formattedMessage}`
          )
        }
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid price list data: ${e instanceof Error ? e.message : String(e)}`
        )
      }

      if (entry.id) {
        data.push({ id: entry.id, ...payload })
      } else {
        data.push(payload)
      }
    }

    return new StepResponse(data)
  }
)
