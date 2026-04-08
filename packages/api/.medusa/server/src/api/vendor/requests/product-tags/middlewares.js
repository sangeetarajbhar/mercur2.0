"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorProductTagRequestsMiddlewares = void 0;
const framework_1 = require("@medusajs/framework");
const query_config_1 = require("./query-config");
const validators_1 = require("./validators");
const helpers_1 = require("./helpers");
exports.vendorProductTagRequestsMiddlewares = [
    {
        method: ["GET"],
        matcher: "/vendor/requests/product-tags",
        middlewares: [
            (0, framework_1.validateAndTransformQuery)(validators_1.VendorGetProductTagRequestsParams, query_config_1.listTransformQueryConfig),
            (0, helpers_1.applyRequestCustomFieldsFilter)(),
        ],
    },
    {
        method: ["POST"],
        matcher: "/vendor/requests/product-tags",
        middlewares: [
            (0, framework_1.validateAndTransformBody)(validators_1.VendorCreateProductTagRequest),
            (0, framework_1.validateAndTransformQuery)(validators_1.VendorGetProductTagRequestsParams, query_config_1.retrieveTransformQueryConfig),
        ],
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3ZlbmRvci9yZXF1ZXN0cy9wcm9kdWN0LXRhZ3MvbWlkZGxld2FyZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsbURBRzRCO0FBRTVCLGlEQUF1RjtBQUN2Riw2Q0FHcUI7QUFDckIsdUNBQTBEO0FBRTdDLFFBQUEsbUNBQW1DLEdBQXNCO0lBQ3BFO1FBQ0UsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ2YsT0FBTyxFQUFFLCtCQUErQjtRQUN4QyxXQUFXLEVBQUU7WUFDWCxJQUFBLHFDQUF5QixFQUN2Qiw4Q0FBaUMsRUFDakMsdUNBQXdCLENBQ3pCO1lBQ0QsSUFBQSx3Q0FBOEIsR0FBRTtTQUNqQztLQUNGO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsQ0FBQyxNQUFNLENBQUM7UUFDaEIsT0FBTyxFQUFFLCtCQUErQjtRQUN4QyxXQUFXLEVBQUU7WUFDWCxJQUFBLG9DQUF3QixFQUFDLDBDQUE2QixDQUFDO1lBQ3ZELElBQUEscUNBQXlCLEVBQ3ZCLDhDQUFpQyxFQUNqQywyQ0FBNEIsQ0FDN0I7U0FDRjtLQUNGO0NBQ0YsQ0FBQSJ9