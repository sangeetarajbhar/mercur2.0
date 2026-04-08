"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTransformQueryConfig = exports.retrieveTransformQueryConfig = exports.defaultVendorProductCategoryRequestFields = void 0;
exports.defaultVendorProductCategoryRequestFields = [
    "id",
    "name",
    "handle",
    "description",
    "is_active",
    "is_internal",
    "custom_fields.*",
    "created_at",
    "updated_at",
];
exports.retrieveTransformQueryConfig = {
    defaults: exports.defaultVendorProductCategoryRequestFields,
    isList: false,
};
exports.listTransformQueryConfig = {
    ...exports.retrieveTransformQueryConfig,
    isList: true,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnktY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2FwaS92ZW5kb3IvcmVxdWVzdHMvcHJvZHVjdC1jYXRlZ29yaWVzL3F1ZXJ5LWNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBYSxRQUFBLHlDQUF5QyxHQUFHO0lBQ3ZELElBQUk7SUFDSixNQUFNO0lBQ04sUUFBUTtJQUNSLGFBQWE7SUFDYixXQUFXO0lBQ1gsYUFBYTtJQUNiLGlCQUFpQjtJQUNqQixZQUFZO0lBQ1osWUFBWTtDQUNiLENBQUE7QUFFWSxRQUFBLDRCQUE0QixHQUFHO0lBQzFDLFFBQVEsRUFBRSxpREFBeUM7SUFDbkQsTUFBTSxFQUFFLEtBQUs7Q0FDZCxDQUFBO0FBRVksUUFBQSx3QkFBd0IsR0FBRztJQUN0QyxHQUFHLG9DQUE0QjtJQUMvQixNQUFNLEVBQUUsSUFBSTtDQUNiLENBQUEifQ==