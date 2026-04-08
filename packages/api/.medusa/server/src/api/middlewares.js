"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const medusa_1 = require("@medusajs/medusa");
const middlewares_1 = require("./admin/requests/middlewares");
const middlewares_2 = require("./vendor/requests/product-collections/middlewares");
const middlewares_3 = require("./vendor/requests/product-categories/middlewares");
const middlewares_4 = require("./vendor/requests/product-types/middlewares");
const middlewares_5 = require("./vendor/requests/product-tags/middlewares");
const middlewares_6 = require("./store/requests/middlewares");
const middlewares_7 = require("./admin/zones/middlewares");
const middlewares_8 = require("./admin/controls/middlewares");
exports.default = (0, medusa_1.defineMiddlewares)({
    routes: [
        ...middlewares_1.adminRequestsMiddlewares,
        ...middlewares_2.vendorProductCollectionRequestsMiddlewares,
        ...middlewares_3.vendorProductCategoryRequestsMiddlewares,
        ...middlewares_4.vendorProductTypeRequestsMiddlewares,
        ...middlewares_5.vendorProductTagRequestsMiddlewares,
        ...middlewares_6.storeRequestsMiddlewares,
        ...middlewares_7.zonesRoutesMiddlewares,
        ...middlewares_8.controlsRoutesMiddlewares,
    ],
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvYXBpL21pZGRsZXdhcmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsNkNBQW9EO0FBRXBELDhEQUF1RTtBQUN2RSxtRkFBOEc7QUFDOUcsa0ZBQTJHO0FBQzNHLDZFQUFrRztBQUNsRyw0RUFBZ0c7QUFDaEcsOERBQXVFO0FBQ3ZFLDJEQUFrRTtBQUNsRSw4REFBd0U7QUFFeEUsa0JBQWUsSUFBQSwwQkFBaUIsRUFBQztJQUMvQixNQUFNLEVBQUU7UUFDTixHQUFHLHNDQUF3QjtRQUMzQixHQUFHLHdEQUEwQztRQUM3QyxHQUFHLHNEQUF3QztRQUMzQyxHQUFHLGtEQUFvQztRQUN2QyxHQUFHLGlEQUFtQztRQUN0QyxHQUFHLHNDQUF3QjtRQUMzQixHQUFHLG9DQUFzQjtRQUN6QixHQUFHLHVDQUF5QjtLQUM3QjtDQUNGLENBQUMsQ0FBQSJ9