"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstantPromises = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.InstantPromises = utils_1.model.define("instant_promise", {
    id: utils_1.model.id({ prefix: "ip" }).primaryKey(),
    zone_id: utils_1.model.text(),
    promise_text: utils_1.model.text(),
    promise_minutes: utils_1.model.number(),
    pickup_lead_minutes: utils_1.model.number().default(0),
    return_lead_minutes: utils_1.model.number().default(0),
    is_active: utils_1.model.boolean().default(true),
    metadata: utils_1.model.json().default({}),
    created_by: utils_1.model.text().nullable(),
    updated_by: utils_1.model.text().nullable(),
});
exports.default = exports.InstantPromises;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFudF9wcm9taXNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvaW5zdGFudC1wcm9taXNlcy9tb2RlbHMvaW5zdGFudF9wcm9taXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUFpRDtBQUVwQyxRQUFBLGVBQWUsR0FBRyxhQUFLLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFO0lBQzdELEVBQUUsRUFBRSxhQUFLLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFO0lBQzNDLE9BQU8sRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ3JCLFlBQVksRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQzFCLGVBQWUsRUFBRSxhQUFLLENBQUMsTUFBTSxFQUFFO0lBQy9CLG1CQUFtQixFQUFFLGFBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzlDLG1CQUFtQixFQUFFLGFBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzlDLFNBQVMsRUFBRSxhQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztJQUN4QyxRQUFRLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7SUFDbEMsVUFBVSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDbkMsVUFBVSxFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDcEMsQ0FBQyxDQUFBO0FBRUYsa0JBQWUsdUJBQWUsQ0FBQSJ9