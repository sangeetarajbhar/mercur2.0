"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const stock_location_extension_1 = __importDefault(require("../modules/stock-location-extension"));
const stock_location_1 = __importDefault(require("@medusajs/medusa/stock-location"));
exports.default = (0, utils_1.defineLink)(stock_location_1.default.linkable.stockLocation, {
    linkable: stock_location_extension_1.default.linkable.stockLocationExtension,
}, {
    database: {
        table: "stock_location_stock_location_extension",
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvY2stbG9jYXRpb24tc3RvY2stbG9jYXRpb24tZXh0ZW5zaW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2xpbmtzL3N0b2NrLWxvY2F0aW9uLXN0b2NrLWxvY2F0aW9uLWV4dGVuc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHFEQUFzRDtBQUN0RCxtR0FBOEU7QUFDOUUscUZBQWtFO0FBRWxFLGtCQUFlLElBQUEsa0JBQVUsRUFDdkIsd0JBQW1CLENBQUMsUUFBUSxDQUFDLGFBQWEsRUFDMUM7SUFDRSxRQUFRLEVBQUUsa0NBQTRCLENBQUMsUUFBUSxDQUFDLHNCQUFzQjtDQUN2RSxFQUNEO0lBQ0UsUUFBUSxFQUFFO1FBQ1IsS0FBSyxFQUFFLHlDQUF5QztLQUNqRDtDQUNGLENBQ0YsQ0FBQSJ9