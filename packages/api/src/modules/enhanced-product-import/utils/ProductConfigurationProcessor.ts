import { normalizeCSVValue, isPresent, MedusaError } from "@medusajs/framework/utils";
import { createError } from "./enhanced-csv-normalizer";
import { EnhancedColumnProcessor } from "./EnhancedColumnProcessor";

/**
 * Product Configuration Column Processor
 */
export class ProductConfigurationProcessor implements EnhancedColumnProcessor {
    readonly type = 'productConfiguration';
    readonly priority = 80;

    private static configColumns = [
        'returnable', 'is returnable', 'exchangeable', 'is exchangeable',
        'try and buy', 'is try and buy', 'returnable days'
    ];

    canHandle(columnName: string, normalizedName: string): boolean {
        return ProductConfigurationProcessor.configColumns.includes(normalizedName);
    }

    process(
        csvRow: Record<string, string | boolean | number>,
        rowColumns: string[],
        rowNumber: number,
        output: any,
        currentColumn: string
    ): void {

        const normalizedColumn = normalizeCSVValue(currentColumn).toLowerCase();
        const value = csvRow[currentColumn];

        if (!isPresent(value)) {
            throw new MedusaError(MedusaError.Types.INVALID_DATA, `Product configuration cannot be empty: ${value} row number : ${rowNumber}`);
        }
        output.productConfiguration = output.productConfiguration || {};

        switch (normalizedColumn) {
            case 'returnable':
            case 'is returnable': {
                const returnableValue = tryConvertToBoolean(value, value);
                output.productConfiguration.is_returnable = returnableValue;

                // Cross-validate with returnable days
                const returnableDaysValue = this.findReturnableDaysValue(csvRow, rowColumns);
                if (returnableDaysValue !== null) {
                    this.validateReturnableConsistency(returnableValue, returnableDaysValue, rowNumber);
                } else {
                    throw createError(rowNumber, `Returnable days column is required when returnable is specified`);
                }
                break;
            }
            case 'exchangeable':
            case 'is exchangeable':
                output.productConfiguration.is_exchangeable = tryConvertToBoolean(value, value);
                break;
            case 'try and buy':
            case 'is try and buy':
                output.productConfiguration.is_try_and_buy = tryConvertToBoolean(value, value);
                break;
            case 'returnable days': {
                const numericValue = tryConvertToNumber(value);
                if (numericValue === undefined) {
                    throw createError(rowNumber, `Invalid returnable days: ${value}`);
                }
                output.productConfiguration.returnable_days = numericValue;

                // Cross-validate with returnable
                const isReturnableValue = this.findReturnableValue(csvRow, rowColumns);
                if (isReturnableValue !== null) {
                    this.validateReturnableConsistency(isReturnableValue, numericValue, rowNumber);
                } else {
                    throw createError(rowNumber, `Returnable column is required when returnable days is specified`);
                }
                break;
            }
        }
    }

    /**
     * Find the returnable column value from the CSV row
     */
    private findReturnableValue(csvRow: Record<string, string | boolean | number>, rowColumns: string[]): boolean | null {
        for (const column of rowColumns) {
            const normalized = normalizeCSVValue(column).toLowerCase();
            if (normalized === 'returnable' || normalized === 'is returnable') {
                const value = csvRow[column];
                if (isPresent(value)) {
                    return tryConvertToBoolean(value, value);
                }
            }
        }
        return null;
    }

    /**
     * Find the returnable days column value from the CSV row
     */
    private findReturnableDaysValue(csvRow: Record<string, string | boolean | number>, rowColumns: string[]): number | null {
        for (const column of rowColumns) {
            const normalized = normalizeCSVValue(column).toLowerCase();
            if (normalized === 'returnable days') {
                const value = csvRow[column];
                if (isPresent(value)) {
                    return tryConvertToNumber(value) ?? null;
                }
            }
        }
        return null;
    }

    /**
     * Validate consistency between returnable and returnable days
     */
    private validateReturnableConsistency(isReturnable: boolean, returnableDays: number, rowNumber: number): void {
        if (isReturnable === true && returnableDays === 0) {
            throw createError(rowNumber, `Returnable is true but returnable days is 0`);
        }
        if (isReturnable === false && returnableDays > 0) {
            throw createError(rowNumber, `Returnable is false but returnable days is ${returnableDays}`);
        }
    }
}
// Utility function for boolean conversion (following Medusa pattern)

export function tryConvertToBoolean(value: any, fallback: any): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
        const lower = value.toLowerCase().trim()
        if (['true', '1', 'yes'].includes(lower)) return true
        if (['false', '0', 'no'].includes(lower)) return false
    }
    return fallback
}
// Utility function for number conversion (following Medusa pattern)

export function tryConvertToNumber(value: any): number | undefined {
    if (typeof value === 'number') return value
    const num = Number(value)
    return isNaN(num) ? undefined : num
}

