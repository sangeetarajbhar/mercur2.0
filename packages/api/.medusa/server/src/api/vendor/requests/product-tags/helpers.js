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
        const customFieldRows = await customFieldsService.list("product_tag", filters, {});
        const entityIds = customFieldRows.map((row) => row["product_tag_id"]);
        req.filterableFields.id = entityIds;
        return next();
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvdmVuZG9yL3JlcXVlc3RzL3Byb2R1Y3QtdGFncy9oZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBSUEsd0VBeUJDO0FBNUJELDJDQUErQztBQUcvQyxTQUFnQiw4QkFBOEI7SUFDNUMsT0FBTyxLQUFLLFdBQ1YsR0FBK0IsRUFDL0IsSUFBb0IsRUFDcEIsSUFBd0I7UUFFeEIsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBNEIscUJBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUVyRyxNQUFNLE9BQU8sR0FBc0M7WUFDakQsWUFBWSxFQUFFLEdBQUcsQ0FBQyxZQUFhLENBQUMsUUFBUTtTQUN6QyxDQUFBO1FBRUQsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDeEMsT0FBTyxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsY0FBbUMsQ0FBQTtZQUNqRixPQUFPLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUE7UUFDNUMsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLE1BQU0sbUJBQW1CLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFbEYsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQTtRQUVyRSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxHQUFHLFNBQVMsQ0FBQTtRQUVuQyxPQUFPLElBQUksRUFBRSxDQUFBO0lBQ2YsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9