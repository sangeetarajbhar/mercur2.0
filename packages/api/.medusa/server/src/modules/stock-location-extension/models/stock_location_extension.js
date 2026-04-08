"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockLocationExtension = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.StockLocationExtension = utils_1.model.define("stock_location_extension", {
    id: utils_1.model.id().primaryKey(),
    location_type: utils_1.model.text(),
    address_type: utils_1.model.text(),
    latitude: utils_1.model.float().nullable(),
    longitude: utils_1.model.float().nullable(),
    partner_id: utils_1.model.text(),
    return_location_id: utils_1.model.text(),
    status: utils_1.model.text(),
    servisibility_status: utils_1.model.text(),
    start_time: utils_1.model.text(),
    end_time: utils_1.model.text(),
    is_delay: utils_1.model.boolean().default(false),
    delay_value: utils_1.model.text().nullable(),
    delay_message: utils_1.model.text().nullable(),
    created_by: utils_1.model.text().nullable(),
    updated_by: utils_1.model.text().nullable(),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvY2tfbG9jYXRpb25fZXh0ZW5zaW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvc3RvY2stbG9jYXRpb24tZXh0ZW5zaW9uL21vZGVscy9zdG9ja19sb2NhdGlvbl9leHRlbnNpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBQWlEO0FBRXBDLFFBQUEsc0JBQXNCLEdBQUcsYUFBSyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsRUFBRTtJQUM3RSxFQUFFLEVBQUUsYUFBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRTtJQUMzQixhQUFhLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRTtJQUMzQixZQUFZLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRTtJQUMxQixRQUFRLEVBQUUsYUFBSyxDQUFDLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUNsQyxTQUFTLEVBQUUsYUFBSyxDQUFDLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUNuQyxVQUFVLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRTtJQUN4QixrQkFBa0IsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ2hDLE1BQU0sRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ3BCLG9CQUFvQixFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDbEMsVUFBVSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDeEIsUUFBUSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDdEIsUUFBUSxFQUFFLGFBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQ3hDLFdBQVcsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3BDLGFBQWEsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3RDLFVBQVUsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ25DLFVBQVUsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0NBQ3BDLENBQUMsQ0FBQSJ9