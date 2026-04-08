"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTransformQueryConfig = exports.retrieveTransformQueryConfig = exports.defaultVendorProductTagRequestFields = void 0;
exports.defaultVendorProductTagRequestFields = [
    "id",
    "value",
    "custom_fields.*",
    "created_at",
    "updated_at",
];
exports.retrieveTransformQueryConfig = {
    defaults: exports.defaultVendorProductTagRequestFields,
    isList: false,
};
exports.listTransformQueryConfig = {
    ...exports.retrieveTransformQueryConfig,
    isList: true,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnktY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2FwaS92ZW5kb3IvcmVxdWVzdHMvcHJvZHVjdC10YWdzL3F1ZXJ5LWNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBYSxRQUFBLG9DQUFvQyxHQUFHO0lBQ2xELElBQUk7SUFDSixPQUFPO0lBQ1AsaUJBQWlCO0lBQ2pCLFlBQVk7SUFDWixZQUFZO0NBQ2IsQ0FBQTtBQUVZLFFBQUEsNEJBQTRCLEdBQUc7SUFDMUMsUUFBUSxFQUFFLDRDQUFvQztJQUM5QyxNQUFNLEVBQUUsS0FBSztDQUNkLENBQUE7QUFFWSxRQUFBLHdCQUF3QixHQUFHO0lBQ3RDLEdBQUcsb0NBQTRCO0lBQy9CLE1BQU0sRUFBRSxJQUFJO0NBQ2IsQ0FBQSJ9