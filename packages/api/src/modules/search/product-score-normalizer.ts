import * as XLSX from 'xlsx'

/** A single validated row: product ID + normalized score */
export interface ParsedScoreRow {
  productId: string
  score: number
}

/** Result returned by ProductScoreNormalizer.parse() */
export interface ParseScoreResult {
  /** Validated product-id → score map */
  scoreMap: Map<string, number>
  /** Rows that failed validation (for diagnostics, not thrown) */
  parseErrors: Array<{ product_id: string; error: string }>
}

/**
 * Regex pattern for Medusa product IDs.
 * Accepts "prod_" prefix followed by alphanumeric characters.
 */
const PRODUCT_ID_REGEX = /^prod_[a-zA-Z0-9]+$/

/**
 * Shared normalizer for product score CSV / Excel uploads.
 * Shared between Algolia and YesPlz routes.
 *
 * Responsibilities:
 *  1. Parse CSV or Excel buffer to rows
 *  2. Validate required columns (product_id, final_score)
 *  3. Regex-check product IDs
 *  4. Normalize scores (NaN → skip, |value| < 1e-6 → 0)
 *  5. Return Map<productId, score> + parse errors
 */
export class ProductScoreNormalizer {
  /**
   * Parse an uploaded file buffer into a validated score map.
   *
   * @param buffer     - Raw file buffer (CSV or Excel)
   * @param fileName   - Original file name (used to detect CSV vs Excel)
   * @throws Error if the file cannot be parsed or required columns are missing
   */
  parse(buffer: Buffer, fileName: string): ParseScoreResult {
    const rows = this.readRows(buffer, fileName)

    if (rows.length === 0) {
      throw new Error(
        'File is empty or could not be parsed. Please ensure your file contains data with product_id and final_score columns.'
      )
    }

    this.validateColumns(rows[0])

    return this.buildScoreMap(rows)
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private readRows(buffer: Buffer, fileName: string): any[] {
    const isCSV = fileName.toLowerCase().endsWith('.csv')
    let workbook
    if (isCSV) {
      // Remove UTF-8 BOM if present to prevent hidden characters in keys
      const csvString = buffer.toString('utf-8').replace(/^\uFEFF/, '')
      workbook = XLSX.read(csvString, { type: 'string' })
    } else {
      workbook = XLSX.read(buffer, { type: 'buffer' })
    }
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(worksheet)

    // Normalize row keys to strip any hidden characters and whitespace
    return rows.map((row: any) => {
      const normalizedRow: any = {}
      for (const [key, value] of Object.entries(row)) {
        const cleanKey = key.replace(/^[\uFEFF\u200B]+|[\uFEFF\u200B]+$/g, '').trim()
        normalizedRow[cleanKey] = value
      }
      return normalizedRow
    })
  }

  private validateColumns(firstRow: Record<string, unknown>): void {
    const hasProductId =
      'product_id' in firstRow || 'Product ID' in firstRow || 'id' in firstRow || 'productId' in firstRow
    const hasFinalScore =
      'final_score' in firstRow || 'Final Score' in firstRow || 'score' in firstRow

    if (!hasProductId || !hasFinalScore) {
      throw new Error(
        `File must contain "product_id" and "final_score" columns. Columns found: ${Object.keys(firstRow).join(', ')}`
      )
    }
  }

  private buildScoreMap(rows: any[]): ParseScoreResult {
    const scoreMap = new Map<string, number>()
    const parseErrors: Array<{ product_id: string; error: string }> = []

    for (const row of rows) {
      const productId: string =
        (row.product_id ?? row['Product ID'] ?? row.productId ?? row.id ?? '').toString().trim()

      if (!productId) {
        parseErrors.push({ product_id: 'unknown', error: 'Missing product_id in row' })
        continue
      }

      if (!PRODUCT_ID_REGEX.test(productId)) {
        parseErrors.push({
          product_id: productId,
          error: `Invalid product_id format: "${productId}". Expected pattern: prod_<alphanumeric>`
        })
        continue
      }

      const rawScore = row.final_score ?? row['Final Score'] ?? row.score
      let finalScore = parseFloat(String(rawScore))

      if (isNaN(finalScore)) {
        parseErrors.push({
          product_id: productId,
          error: `Invalid final_score value: ${rawScore}`
        })
        continue
      }

      if (Math.abs(finalScore) < 1e-6) {
        finalScore = 0
      }

      scoreMap.set(productId, finalScore)
    }

    return { scoreMap, parseErrors }
  }
}

/** Singleton instance — shared across routes */
export const productScoreNormalizer = new ProductScoreNormalizer()
