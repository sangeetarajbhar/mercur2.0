"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTransformQueryConfig = exports.retrieveTransformQueryConfig = exports.defaultVendorProductCollectionRequestFields = void 0;
exports.defaultVendorProductCollectionRequestFields = [
    "id",
    "title",
    "handle",
    "custom_fields.*",
    "created_at",
    "updated_at",
];
exports.retrieveTransformQueryConfig = {
    defaults: exports.defaultVendorProductCollectionRequestFields,
    isList: false,
};
exports.listTransformQueryConfig = {
    ...exports.retrieveTransformQueryConfig,
    isList: true,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnktY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2FwaS92ZW5kb3IvcmVxdWVzdHMvcHJvZHVjdC1jb2xsZWN0aW9ucy9xdWVyeS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQWEsUUFBQSwyQ0FBMkMsR0FBRztJQUN6RCxJQUFJO0lBQ0osT0FBTztJQUNQLFFBQVE7SUFDUixpQkFBaUI7SUFDakIsWUFBWTtJQUNaLFlBQVk7Q0FDYixDQUFBO0FBRVksUUFBQSw0QkFBNEIsR0FBRztJQUMxQyxRQUFRLEVBQUUsbURBQTJDO0lBQ3JELE1BQU0sRUFBRSxLQUFLO0NBQ2QsQ0FBQTtBQUVZLFFBQUEsd0JBQXdCLEdBQUc7SUFDdEMsR0FBRyxvQ0FBNEI7SUFDL0IsTUFBTSxFQUFFLElBQUk7Q0FDYixDQUFBIn0=