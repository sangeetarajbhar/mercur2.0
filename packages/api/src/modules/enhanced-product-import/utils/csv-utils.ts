// export function decodeBase64CSV(base64Data: string): string {
//   try {
//     return Buffer.from(base64Data, 'base64').toString('utf-8')
//   } catch (error) {
//     throw new Error(`Invalid Base64 CSV data: ${error.message}`)
//   }
// }

// export function validateCSVFormat(csvData: string): { valid: boolean; errors: string[] } {
//   const errors: string[] = []

//   if (!csvData || csvData.trim() === '') {
//     errors.push('CSV data is empty')
//     return { valid: false, errors }
//   }

//   const lines = csvData.split('\n').filter(line => line.trim())

//   if (lines.length < 2) {
//     errors.push('CSV must contain at least a header row and one data row')
//     return { valid: false, errors }
//   }

//   const headerLine = lines[0]
//   const requiredColumns = ['handle', 'title']

//   requiredColumns.forEach(column => {
//     if (!headerLine.toLowerCase().includes(column)) {
//       errors.push(`Missing required column: ${column}`)
//     }
//   })

//   return { valid: errors.length === 0, errors }
// }

// export function sanitizeCSVData(csvData: string): string {
//   return csvData
//     .replace(/\r\n/g, '\n')
//     .replace(/\r/g, '\n')
//     .trim()
// }

// export function parseCSVHeaders(csvData: string): string[] {
//   const lines = csvData.split('\n').filter(line => line.trim())
//   if (lines.length === 0) {
//     throw new Error('CSV file is empty')
//   }

//   return parseCSVLine(lines[0])
// }

// export function parseCSVLine(line: string): string[] {
//   const result: string[] = []
//   let current = ''
//   let inQuotes = false

//   for (let i = 0; i < line.length; i++) {
//     const char = line[i]

//     if (char === '"') {
//       inQuotes = !inQuotes
//     } else if (char === ',' && !inQuotes) {
//       result.push(current.trim())
//       current = ''
//     } else {
//       current += char
//     }
//   }

//   result.push(current.trim())
//   return result.map(cell => cell.replace(/^"|"$/g, ''))
// }