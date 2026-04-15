import { isPresent } from "@medusajs/framework/utils";
import { EnhancedColumnProcessor } from "./EnhancedColumnProcessor";

/**
 * Status Column Processor - handles product status column processing
 *
 * This processor:
 * 1. Captures the status column value from CSV
 * 2. Stores it for later processing in the enrichProduct method
 * 3. Does NOT apply any status logic here - that happens in enrichProduct
 *
 * Priority: 95 (High, but lower than Brand)
 */
export class StatusColumnProcessor implements EnhancedColumnProcessor {
    readonly type = 'status';
    readonly priority = 95;

    /**
     * Determines if this processor can handle the column
     * Handles columns with normalized names: 'status', 'product status'
     */
    canHandle(columnName: string, normalizedName: string): boolean {
        return normalizedName === 'status' || normalizedName === 'product status';
    }

    /**
     * Processes the status column by capturing its value
     * The actual status logic happens later in enrichProduct method
     */
    process(
        csvRow: Record<string, string | boolean | number>,
        rowColumns: string[],
        rowNumber: number,
        output: any,
        currentColumn: string
    ): void {
        const value = csvRow[currentColumn];
        if (isPresent(value)) {
            // Store the raw status value - enrichProduct will handle the logic
            output.csvStatus = String(value).toLowerCase().trim();
        }
    }
}