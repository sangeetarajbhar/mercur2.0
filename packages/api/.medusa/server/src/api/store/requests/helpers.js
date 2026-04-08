"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.excludePendingRequestEntities = excludePendingRequestEntities;
const types_1 = require("@mercurjs/types");
function excludePendingRequestEntities(alias) {
    return async function (req, _res, next) {
        const customFieldsService = req.scope.resolve(types_1.MercurModules.CUSTOM_FIELDS);
        const pendingRows = await customFieldsService.list(alias, {
            request_status: 'pending',
        }, {});
        const pendingIds = pendingRows.map((row) => row[`${alias}_id`]);
        if (pendingIds.length > 0) {
            const existingIdFilter = req.filterableFields.id;
            if (existingIdFilter) {
                // If there's already an id filter, intersect with non-pending
                const existingIds = Array.isArray(existingIdFilter)
                    ? existingIdFilter
                    : [existingIdFilter];
                req.filterableFields.id = existingIds.filter((id) => !pendingIds.includes(id));
            }
            else {
                req.filterableFields.id = { $nin: pendingIds };
            }
        }
        return next();
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscGVycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9hcGkvc3RvcmUvcmVxdWVzdHMvaGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUlBLHNFQWlDQztBQXBDRCwyQ0FBK0M7QUFHL0MsU0FBZ0IsNkJBQTZCLENBQUMsS0FBYTtJQUN6RCxPQUFPLEtBQUssV0FDVixHQUFrQixFQUNsQixJQUFvQixFQUNwQixJQUF3QjtRQUV4QixNQUFNLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUE0QixxQkFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRXJHLE1BQU0sV0FBVyxHQUFHLE1BQU0sbUJBQW1CLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUN4RCxjQUFjLEVBQUUsU0FBUztTQUMxQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRU4sTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQTJCLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUV2RixJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUIsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFBO1lBRWhELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDckIsOERBQThEO2dCQUM5RCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO29CQUNqRCxDQUFDLENBQUMsZ0JBQWdCO29CQUNsQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUV0QixHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQzFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBWSxDQUFDLENBQzNDLENBQUE7WUFDSCxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQTtZQUNoRCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sSUFBSSxFQUFFLENBQUE7SUFDZixDQUFDLENBQUE7QUFDSCxDQUFDIn0=