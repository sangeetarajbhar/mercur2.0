"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLocationTiming = fetchLocationTiming;
const utils_1 = require("@medusajs/framework/utils");
const stock_location_stock_location_extension_1 = __importDefault(require("../../../links/stock-location-stock-location-extension"));
async function fetchLocationTiming(scope, locationId) {
    const query = scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    try {
        const { data: locationExtensions } = await query.graph({
            entity: stock_location_stock_location_extension_1.default.entryPoint,
            fields: ["stock_location_extension.start_time", "stock_location_extension.end_time"],
            filters: { stock_location_id: locationId },
        });
        if (!locationExtensions || locationExtensions.length === 0) {
            return {
                start_time: null,
                end_time: null,
            };
        }
        const extension = locationExtensions[0];
        return {
            start_time: extension?.stock_location_extension?.start_time || null,
            end_time: extension?.stock_location_extension?.end_time || null,
        };
    }
    catch {
        return {
            start_time: null,
            end_time: null,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYXRpb24tdGltaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvem9uZS91dGlscy9sb2NhdGlvbi10aW1pbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFRQSxrREErQkM7QUF2Q0QscURBQXFFO0FBQ3JFLHFJQUF3RztBQU9qRyxLQUFLLFVBQVUsbUJBQW1CLENBQ3ZDLEtBQTRDLEVBQzVDLFVBQWtCO0lBRWxCLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsS0FBSyxDQUFRLENBQUE7SUFFbkUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztZQUNyRCxNQUFNLEVBQUUsaURBQW1DLENBQUMsVUFBVTtZQUN0RCxNQUFNLEVBQUUsQ0FBQyxxQ0FBcUMsRUFBRSxtQ0FBbUMsQ0FBQztZQUNwRixPQUFPLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQUU7U0FDM0MsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLGtCQUFrQixJQUFJLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzRCxPQUFPO2dCQUNMLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixRQUFRLEVBQUUsSUFBSTthQUNmLENBQUE7UUFDSCxDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkMsT0FBTztZQUNMLFVBQVUsRUFBRSxTQUFTLEVBQUUsd0JBQXdCLEVBQUUsVUFBVSxJQUFJLElBQUk7WUFDbkUsUUFBUSxFQUFFLFNBQVMsRUFBRSx3QkFBd0IsRUFBRSxRQUFRLElBQUksSUFBSTtTQUNoRSxDQUFBO0lBQ0gsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNQLE9BQU87WUFDTCxVQUFVLEVBQUUsSUFBSTtZQUNoQixRQUFRLEVBQUUsSUFBSTtTQUNmLENBQUE7SUFDSCxDQUFDO0FBQ0gsQ0FBQyJ9