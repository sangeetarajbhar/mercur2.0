import { ValidationContext } from "./enhanced-csv-normalizer";

// Strategy pattern interfaces (Medusa-compatible)

export interface EnhancedColumnProcessor<Output = any> {
    readonly type: string;
    readonly priority: number; // Higher priority = processed first


    // Identification
    canHandle(columnName: string, normalizedName: string): boolean;

    // Processing (follows Medusa's ColumnProcessor signature)
    // currentColumn parameter specifies which column this call is processing
    process(
        csvRow: Record<string, string | boolean | number>,
        rowColumns: string[],
        rowNumber: number,
        output: Output,
        currentColumn: string
    ): void;

    // Optional validation
    validate?(value: any, context: ValidationContext): void;
}
