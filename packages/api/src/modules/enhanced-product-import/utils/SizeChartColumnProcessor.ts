import { normalizeCSVValue, isPresent } from "@medusajs/framework/utils";
import { EnhancedColumnProcessor } from "./EnhancedColumnProcessor";

/**
 * Size Chart Column Processor - handles size chart data
 */
export class SizeChartColumnProcessor implements EnhancedColumnProcessor {
    readonly type = 'sizeChart';
    readonly priority = 90;

    canHandle(columnName: string, normalizedName: string): boolean {
        return normalizedName.endsWith('(size chart)');
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
            const measurementName = currentColumn.replace(/\s*\(size chart\)$/i, '').trim();

            output.sizeChartData = output.sizeChartData || {};
            output.sizeChartData[measurementName] = String(value);
        }
    }
}
