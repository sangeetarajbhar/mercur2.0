"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeRequestsMiddlewares = void 0;
const helpers_1 = require("./helpers");
exports.storeRequestsMiddlewares = [
    {
        method: ["GET"],
        matcher: "/store/product-categories",
        middlewares: [(0, helpers_1.excludePendingRequestEntities)("product_category")],
    },
    {
        method: ["GET"],
        matcher: "/store/collections",
        middlewares: [(0, helpers_1.excludePendingRequestEntities)("product_collection")],
    },
    {
        method: ["GET"],
        matcher: "/store/product-tags",
        middlewares: [(0, helpers_1.excludePendingRequestEntities)("product_tag")],
    },
    {
        method: ["GET"],
        matcher: "/store/product-types",
        middlewares: [(0, helpers_1.excludePendingRequestEntities)("product_type")],
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL3JlcXVlc3RzL21pZGRsZXdhcmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLHVDQUF5RDtBQUU1QyxRQUFBLHdCQUF3QixHQUFzQjtJQUN6RDtRQUNFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNmLE9BQU8sRUFBRSwyQkFBMkI7UUFDcEMsV0FBVyxFQUFFLENBQUMsSUFBQSx1Q0FBNkIsRUFBQyxrQkFBa0IsQ0FBQyxDQUFDO0tBQ2pFO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDZixPQUFPLEVBQUUsb0JBQW9CO1FBQzdCLFdBQVcsRUFBRSxDQUFDLElBQUEsdUNBQTZCLEVBQUMsb0JBQW9CLENBQUMsQ0FBQztLQUNuRTtJQUNEO1FBQ0UsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ2YsT0FBTyxFQUFFLHFCQUFxQjtRQUM5QixXQUFXLEVBQUUsQ0FBQyxJQUFBLHVDQUE2QixFQUFDLGFBQWEsQ0FBQyxDQUFDO0tBQzVEO0lBQ0Q7UUFDRSxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDZixPQUFPLEVBQUUsc0JBQXNCO1FBQy9CLFdBQVcsRUFBRSxDQUFDLElBQUEsdUNBQTZCLEVBQUMsY0FBYyxDQUFDLENBQUM7S0FDN0Q7Q0FDRixDQUFBIn0=