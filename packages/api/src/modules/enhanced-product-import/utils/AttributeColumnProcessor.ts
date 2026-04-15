import { isPresent } from "@medusajs/framework/utils";
import type { CategoryAttributeWithValues } from "../types";
import { ValidationContext, createError } from "./enhanced-csv-normalizer";
import { EnhancedColumnProcessor } from "./EnhancedColumnProcessor";

/**
 * Dynamic Attribute Column Processor
 */
export class AttributeColumnProcessor implements EnhancedColumnProcessor {
    readonly type = 'attribute';
    readonly priority = 70;

    constructor(private attributeMap: Map<string, CategoryAttributeWithValues>) { }

    canHandle(columnName: string, normalizedName: string): boolean {
        return this.attributeMap.has(columnName.toLocaleLowerCase());
    }

    process(
        csvRow: Record<string, string | boolean | number>,
        rowColumns: string[],
        rowNumber: number,
        output: any,
        currentColumn: string
    ): void {

        if (!csvRow[currentColumn]) {
            return;
        }

        const lowerKey = currentColumn.toLowerCase();
        const attribute = this.attributeMap.get(lowerKey);

        if (attribute) {
            const value = csvRow[currentColumn];
            if (isPresent(value)) {
                // Validate against possible values
                this.validate(value, { attribute, rowNumber });

                output.enhancedAttributes = output.enhancedAttributes || {};
                output.enhancedAttributes[attribute.attribute.handle] = {
                    attribute_id: attribute.attribute.id,
                    value: value
                };
            }
        }
    }

    validate(value: any, context: ValidationContext): void {
        if (!context.attribute) return;

        const { attribute, rowNumber } = context;
        if (attribute.possibleValues?.length > 0) {
            const possibleValues = attribute.possibleValues.map(v => v.value.trim());
            const stringValue = String(value).trim();
            const isValid = possibleValues.some(pv => pv.toLowerCase() === stringValue.toLowerCase());

            if (!isValid) {
                throw createError(
                    rowNumber,
                    `Invalid value '${value}' for attribute '${attribute.attribute.name}'. Possible values: ${possibleValues.join(', ')}`
                );
            }
        }
    }
}
