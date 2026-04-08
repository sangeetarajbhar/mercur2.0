"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTransformQueryConfig = exports.retrieveTransformQueryConfig = exports.defaultVendorProductTypeRequestFields = void 0;
exports.defaultVendorProductTypeRequestFields = [
    "id",
    "value",
    "custom_fields.*",
    "created_at",
    "updated_at",
];
exports.retrieveTransformQueryConfig = {
    defaults: exports.defaultVendorProductTypeRequestFields,
    isList: false,
};
exports.listTransformQueryConfig = {
    ...exports.retrieveTransformQueryConfig,
    isList: true,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnktY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2FwaS92ZW5kb3IvcmVxdWVzdHMvcHJvZHVjdC10eXBlcy9xdWVyeS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQWEsUUFBQSxxQ0FBcUMsR0FBRztJQUNuRCxJQUFJO0lBQ0osT0FBTztJQUNQLGlCQUFpQjtJQUNqQixZQUFZO0lBQ1osWUFBWTtDQUNiLENBQUE7QUFFWSxRQUFBLDRCQUE0QixHQUFHO0lBQzFDLFFBQVEsRUFBRSw2Q0FBcUM7SUFDL0MsTUFBTSxFQUFFLEtBQUs7Q0FDZCxDQUFBO0FBRVksUUFBQSx3QkFBd0IsR0FBRztJQUN0QyxHQUFHLG9DQUE0QjtJQUMvQixNQUFNLEVBQUUsSUFBSTtDQUNiLENBQUEifQ==