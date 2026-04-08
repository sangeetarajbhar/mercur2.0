"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const workflows_1 = require("../../../../workflows/requests/workflows");
async function GET(req, res) {
    const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const { data: entities, metadata } = await query.graph({
        entity: "product_type",
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
async function POST(req, res) {
    const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const { result: productType } = await (0, workflows_1.createProductTypeRequestWorkflow)(req.scope).run({
        input: {
            product_type: req.validatedBody,
            submitter_id: req.auth_context.actor_id,
        },
    });
    const { data: [entity], } = await query.graph({
        entity: "product_type",
        fields: req.queryConfig.fields,
        filters: { id: productType.id },
    });
    res.status(201).json({ request: entity });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3ZlbmRvci9yZXF1ZXN0cy9wcm9kdWN0LXR5cGVzL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBT0Esa0JBbUJDO0FBRUQsb0JBc0JDO0FBakRELHFEQUFxRTtBQUdyRSx3RUFBMkY7QUFHcEYsS0FBSyxVQUFVLEdBQUcsQ0FDdkIsR0FBdUUsRUFDdkUsR0FBOEM7SUFFOUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFaEUsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxjQUFjO1FBQ3RCLE1BQU0sRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLE1BQU07UUFDOUIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0I7UUFDN0IsVUFBVSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsVUFBVTtLQUN2QyxDQUFDLENBQUE7SUFFRixHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ1AsUUFBUSxFQUFFLFFBQVE7UUFDbEIsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLElBQUksQ0FBQztRQUMzQixNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksSUFBSSxDQUFDO1FBQzNCLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUM7S0FDM0IsQ0FBQyxDQUFBO0FBQ0osQ0FBQztBQUVNLEtBQUssVUFBVSxJQUFJLENBQ3hCLEdBQW1FLEVBQ25FLEdBQTBDO0lBRTFDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGlDQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBRWhFLE1BQU0sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsTUFBTSxJQUFBLDRDQUFnQyxFQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDcEYsS0FBSyxFQUFFO1lBQ0wsWUFBWSxFQUFFLEdBQUcsQ0FBQyxhQUFhO1lBQy9CLFlBQVksRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVE7U0FDeEM7S0FDRixDQUFDLENBQUE7SUFFRixNQUFNLEVBQ0osSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQ2YsR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDcEIsTUFBTSxFQUFFLGNBQWM7UUFDdEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTTtRQUM5QixPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVyxDQUFDLEVBQUUsRUFBRTtLQUNoQyxDQUFDLENBQUE7SUFFRixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0FBQzNDLENBQUMifQ==