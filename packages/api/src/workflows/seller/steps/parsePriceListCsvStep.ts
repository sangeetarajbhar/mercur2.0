import { MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { parsePriceListsFromCsv } from '../utils/parse-price-list-csv'

// Note: parsing/validation logic is shared in ../utils/parse-price-list-csv

export type ParsePriceListCsvStepInput = {
  fileContent: string
  fileName: string
}

export const parsePriceListCsvStepId = 'parse-price-list-csv';


export const parsePriceListCsvStep = createStep(
  parsePriceListCsvStepId,
  async (input: ParsePriceListCsvStepInput) => {
    const data = parsePriceListsFromCsv({
      fileContent: input.fileContent,
      fileName: input.fileName,
    })

    return new StepResponse(data)
  }
)
