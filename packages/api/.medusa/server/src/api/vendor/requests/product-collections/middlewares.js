"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorProductCollectionRequestsMiddlewares = void 0;
const framework_1 = require("@medusajs/framework");
const query_config_1 = require("./query-config");
const validators_1 = require("./validators");
const helpers_1 = require("./helpers");
exports.vendorProductCollectionRequestsMiddlewares = [
    {
        method: ["GET"],
        matcher: "/vendor/requests/product-collections",
        middlewares: [
            (0, framework_1.validateAndTransformQuery)(validators_1.VendorGetProductCollectionRequestsParams, query_config_1.listTransformQueryConfig),
            (0, helpers_1.applyRequestCustomFieldsFilter)(),
        ],
    },
    {
        method: ["POST"],
        matcher: "/vendor/requests/product-collections",
        middlewares: [
            (0, framework_1.validateAndTransformBody)(validators_1.VendorCreateProductCollectionRequest),
            (0, framework_1.validateAndTransformQuery)(validators_1.VendorGetProductCollectionRequestsParams, query_config_1.retrieveTransformQueryConfig),
        ],
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3ZlbmRvci9yZXF1ZXN0cy9wcm9kdWN0LWNvbGxlY3Rpb25zL21pZGRsZXdhcmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1EQUc0QjtBQUU1QixpREFBdUY7QUFDdkYsNkNBR3FCO0FBQ3JCLHVDQUEwRDtBQUU3QyxRQUFBLDBDQUEwQyxHQUFzQjtJQUMzRTtRQUNFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNmLE9BQU8sRUFBRSxzQ0FBc0M7UUFDL0MsV0FBVyxFQUFFO1lBQ1gsSUFBQSxxQ0FBeUIsRUFDdkIscURBQXdDLEVBQ3hDLHVDQUF3QixDQUN6QjtZQUNELElBQUEsd0NBQThCLEdBQUU7U0FDakM7S0FDRjtJQUNEO1FBQ0UsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQ2hCLE9BQU8sRUFBRSxzQ0FBc0M7UUFDL0MsV0FBVyxFQUFFO1lBQ1gsSUFBQSxvQ0FBd0IsRUFBQyxpREFBb0MsQ0FBQztZQUM5RCxJQUFBLHFDQUF5QixFQUN2QixxREFBd0MsRUFDeEMsMkNBQTRCLENBQzdCO1NBQ0Y7S0FDRjtDQUNGLENBQUEifQ==