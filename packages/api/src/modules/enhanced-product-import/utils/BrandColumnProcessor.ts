import { isPresent } from "@medusajs/framework/utils";
import { EnhancedColumnProcessor } from "./EnhancedColumnProcessor";

// ============================================================================
// STRATEGY IMPLEMENTATIONS
// ============================================================================
/**
 * Brand Column Processor - handles brand validation
 */
export class BrandColumnProcessor implements EnhancedColumnProcessor {
    readonly type = 'brand';
    readonly priority = 100;

    canHandle(columnName: string, normalizedName: string): boolean {
        return normalizedName === 'brand';
    }

    process(
        csvRow: Record<string, string | boolean | number>,
        rowColumns: string[],
        rowNumber: number,
        output: any,
        currentColumn: string
    ): void {
        const value = csvRow[currentColumn];
        if (isPresent(value)) {
            output.brand = value;
        }
    }
}
