import { csv2json } from "json-2-csv"

// export interface ConvertCsvToJsonOptions<T> {}

export const convertCsvToJson = <T extends object>(
  data: string
//   options?: ConvertCsvToJsonOptions<T>
): T[] => {
  const rawData = csv2json(data, {
    preventCsvInjection: true,
    delimiter: { field: detectDelimiter(data) },
  }) as T[]
  
  // Clean up field names to remove carriage returns and other problematic characters
  return rawData.map(row => {
    const cleanedRow: Record<string, any> = {}
    Object.entries(row as Record<string, any>).forEach(([key, value]) => {
      // Clean the key by removing carriage returns, newlines, and trimming whitespace
      const cleanedKey = key.trim().replace(/[\r\n]/g, '')
      
      // Only add valid, non-empty keys
      if (cleanedKey && cleanedKey.length > 0) {
        cleanedRow[cleanedKey] = value
      } else if (key !== cleanedKey) {
        console.warn(`CSV field name cleaned: "${key}" -> "${cleanedKey}"`)
      }
    })
    return cleanedRow as T
  })
}

const delimiters = [",", ";", "|"]

const detectDelimiter = (data: string) => {
  let delimiter = ","
  const header = data.split("\n")[0]

  for (const del of delimiters) {
    if (header.split(del).length > 1) {
      delimiter = del
      break
    }
  }

  return delimiter
}