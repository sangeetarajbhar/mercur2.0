"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorProductCategoryRequestsMiddlewares = void 0;
const framework_1 = require("@medusajs/framework");
const query_config_1 = require("./query-config");
const validators_1 = require("./validators");
const helpers_1 = require("./helpers");
exports.vendorProductCategoryRequestsMiddlewares = [
    {
        method: ["GET"],
        matcher: "/vendor/requests/product-categories",
        middlewares: [
            (0, framework_1.validateAndTransformQuery)(validators_1.VendorGetProductCategoryRequestsParams, query_config_1.listTransformQueryConfig),
            (0, helpers_1.applyRequestCustomFieldsFilter)(),
        ],
    },
    {
        method: ["POST"],
        matcher: "/vendor/requests/product-categories",
        middlewares: [
            (0, framework_1.validateAndTransformBody)(validators_1.VendorCreateProductCategoryRequest),
            (0, framework_1.validateAndTransformQuery)(validators_1.VendorGetProductCategoryRequestsParams, query_config_1.retrieveTransformQueryConfig),
        ],
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3ZlbmRvci9yZXF1ZXN0cy9wcm9kdWN0LWNhdGVnb3JpZXMvbWlkZGxld2FyZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsbURBRzRCO0FBRTVCLGlEQUF1RjtBQUN2Riw2Q0FHcUI7QUFDckIsdUNBQTBEO0FBRTdDLFFBQUEsd0NBQXdDLEdBQXNCO0lBQ3pFO1FBQ0UsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ2YsT0FBTyxFQUFFLHFDQUFxQztRQUM5QyxXQUFXLEVBQUU7WUFDWCxJQUFBLHFDQUF5QixFQUN2QixtREFBc0MsRUFDdEMsdUNBQXdCLENBQ3pCO1lBQ0QsSUFBQSx3Q0FBOEIsR0FBRTtTQUNqQztLQUNGO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUM7UUFDaEIsT0FBTyxFQUFFLHFDQUFxQztRQUM5QyxXQUFXLEVBQUU7WUFDWCxJQUFBLG9DQUF3QixFQUFDLCtDQUFrQyxDQUFDO1lBQzVELElBQUEscUNBQXlCLEVBQ3ZCLG1EQUFzQyxFQUN0QywyQ0FBNEIsQ0FDN0I7U0FDRjtLQUNGO0NBQ0YsQ0FBQSJ9