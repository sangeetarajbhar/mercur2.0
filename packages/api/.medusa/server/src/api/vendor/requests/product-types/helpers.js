"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyRequestCustomFieldsFilter = applyRequestCustomFieldsFilter;
const types_1 = require("@mercurjs/types");
function applyRequestCustomFieldsFilter() {
    return async function (req, _res, next) {
        const customFieldsService = req.scope.resolve(types_1.MercurModules.CUSTOM_FIELDS);
        const filters = {
            submitter_id: req.auth_context.actor_id,
        };
        if (req.filterableFields.request_status) {
            filters.request_status = req.filterableFields.request_status;
            delete req.filterableFields.request_status;
        }
        const customFieldRows = await customFieldsService.list("product_type", filters, {});
        const entityIds = customFieldRows.map((row) => row["product_type_id"]);
        req.filterableFields.id = entityIds;
        return next();
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvdmVuZG9yL3JlcXVlc3RzL3Byb2R1Y3QtdHlwZXMvaGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUlBLHdFQXlCQztBQTVCRCwyQ0FBK0M7QUFHL0MsU0FBZ0IsOEJBQThCO0lBQzVDLE9BQU8sS0FBSyxXQUNWLEdBQStCLEVBQy9CLElBQW9CLEVBQ3BCLElBQXdCO1FBRXhCLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQTRCLHFCQUFhLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFckcsTUFBTSxPQUFPLEdBQXNDO1lBQ2pELFlBQVksRUFBRSxHQUFHLENBQUMsWUFBYSxDQUFDLFFBQVE7U0FDekMsQ0FBQTtRQUVELElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLGNBQW1DLENBQUE7WUFDakYsT0FBTyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFBO1FBQzVDLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxNQUFNLG1CQUFtQixDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRW5GLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7UUFFdEUsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsR0FBRyxTQUFTLENBQUE7UUFFbkMsT0FBTyxJQUFJLEVBQUUsQ0FBQTtJQUNmLENBQUMsQ0FBQTtBQUNILENBQUMifQ==