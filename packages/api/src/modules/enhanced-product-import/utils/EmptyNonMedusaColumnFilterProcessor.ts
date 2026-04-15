import { MedusaError } from "@medusajs/framework/utils";
import { EnhancedColumnProcessor } from "./EnhancedColumnProcessor";
import { ValidationContext } from "./enhanced-csv-normalizer";

/**
 * Processor that filters out empty non-Medusa columns to prevent errors in Medusa's CSV normalizer.
 * This processor should run with the highest priority to ensure it processes data last,
 * right before Medusa's core normalizer receives it.
 */
export class EmptyNonMedusaColumnFilterProcessor implements EnhancedColumnProcessor {
    readonly type = 'empty-non-medusa-column-filter';
    // Set the lowest priority to ensure this runs last, after all other processors
    readonly priority = 60;

    /**
     * Determines if this processor can handle a specific column/value combination.
     * Handles columns that:
     * 1. Do NOT start with "Product" or "Variant" (standard Medusa prefixes)
     * 2. Have empty values (null, undefined, empty string, or whitespace only)
     * 
     * @param columnName - The name of the column header
     * @param normalizedName - Normalized column name (not used in this implementation)
     * @returns true if this processor should handle this column/value
     */
    canHandle(columnName: string, normalizedName: string): boolean {
        // Check if it's NOT a standard Medusa column (case insensitive)
        const lowerColumnName = columnName.toLowerCase();
        const isNotStandardMedusaColumn = !lowerColumnName.startsWith('product') && !lowerColumnName.startsWith('variant');

        // We'll check the actual value in the process method
        return isNotStandardMedusaColumn;
    }

    /**
     * Processes the CSV row to replace empty values in non-standard Medusa columns with null
     * 
     * @param csvRow - The current CSV row being processed
     * @param rowColumns - Array of column names in the current row
     * @param rowNumber - Current row number (for error reporting)
     * @param output - Output object where results are accumulated
     * @param currentColumn - The specific column currently being processed
     */
    process(
        csvRow: Record<string, string | boolean | number>,
        rowColumns: string[],
        rowNumber: number,
        output: any,
        currentColumn: string
    ): void {
        // Check if this is a non-standard Medusa column (case insensitive)
        const lowerColumnName = currentColumn.toLowerCase();
        const isNotStandardMedusaColumn = !lowerColumnName.startsWith('product') && !lowerColumnName.startsWith('variant');
        
        // If it's a non-standard column and the value is empty, replace with null
        const currentValue = csvRow[currentColumn];
        const isEmptyValue = currentValue === null || 
                           currentValue === undefined || 
                           currentValue === '' || 
                           (typeof currentValue === 'string' && currentValue.trim() === '');
        
        if (isNotStandardMedusaColumn && !isEmptyValue) {
            // Replace empty value with null to prevent Medusa from processing it as a standard column
            throw new MedusaError(MedusaError.Types.INVALID_DATA, `Column '${currentColumn}' contains a value but lacks a processor to handle it at row ${rowNumber} (non-Medusa column)`);
        }
    }

    /**
     * Optional validation method (not needed for this processor)
     */
    validate?(value: any, context: ValidationContext): void {
        // No validation needed for this processor
    }
}