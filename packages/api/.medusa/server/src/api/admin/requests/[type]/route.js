"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const utils_1 = require("@medusajs/framework/utils");
async function GET(req, res) {
    const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const alias = req.params.type;
    const { data: entities, metadata } = await query.graph({
        entity: alias,
        fields: req.queryConfig.fields,
        filters: req.filterableFields,
        pagination: req.queryConfig.pagination,
    });
    res.json({
        requests: entities,
        count: metadata?.count ?? 0,
        offset: metadata?.skip ?? 0,
        limit: metadata?.take ?? 0,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3JlcXVlc3RzL1t0eXBlXS9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU1BLGtCQXFCQztBQTFCRCxxREFBcUU7QUFLOUQsS0FBSyxVQUFVLEdBQUcsQ0FDdkIsR0FBMkQsRUFDM0QsR0FBNkM7SUFFN0MsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFaEUsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFLLENBQUE7SUFFOUIsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxLQUFLO1FBQ2IsTUFBTSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTTtRQUM5QixPQUFPLEVBQUUsR0FBRyxDQUFDLGdCQUFnQjtRQUM3QixVQUFVLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxVQUFVO0tBQ3ZDLENBQUMsQ0FBQTtJQUVGLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDUCxRQUFRLEVBQUUsUUFBUTtRQUNsQixLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDO1FBQzNCLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUM7UUFDM0IsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLElBQUksQ0FBQztLQUMzQixDQUFDLENBQUE7QUFDSixDQUFDIn0=