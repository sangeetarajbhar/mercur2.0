"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const workflows_1 = require("../../../../workflows/requests/workflows");
async function GET(req, res) {
    const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const { data: entities, metadata } = await query.graph({
        entity: "product_category",
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
    const { result: category } = await (0, workflows_1.createProductCategoryRequestWorkflow)(req.scope).run({
        input: {
            product_category: req.validatedBody,
            submitter_id: req.auth_context.actor_id,
        },
    });
    const { data: [entity], } = await query.graph({
        entity: "product_category",
        fields: req.queryConfig.fields,
        filters: { id: category.id },
    });
    res.status(201).json({ request: entity });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3ZlbmRvci9yZXF1ZXN0cy9wcm9kdWN0LWNhdGVnb3JpZXMvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFPQSxrQkFtQkM7QUFFRCxvQkFzQkM7QUFqREQscURBQXFFO0FBR3JFLHdFQUErRjtBQUd4RixLQUFLLFVBQVUsR0FBRyxDQUN2QixHQUEyRSxFQUMzRSxHQUE4QztJQUU5QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUVoRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDckQsTUFBTSxFQUFFLGtCQUFrQjtRQUMxQixNQUFNLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNO1FBQzlCLE9BQU8sRUFBRSxHQUFHLENBQUMsZ0JBQWdCO1FBQzdCLFVBQVUsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLFVBQVU7S0FDdkMsQ0FBQyxDQUFBO0lBRUYsR0FBRyxDQUFDLElBQUksQ0FBQztRQUNQLFFBQVEsRUFBRSxRQUFRO1FBQ2xCLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxJQUFJLENBQUM7UUFDM0IsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLElBQUksQ0FBQztRQUMzQixLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksSUFBSSxDQUFDO0tBQzNCLENBQUMsQ0FBQTtBQUNKLENBQUM7QUFFTSxLQUFLLFVBQVUsSUFBSSxDQUN4QixHQUF1RSxFQUN2RSxHQUEwQztJQUUxQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUVoRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sSUFBQSxnREFBb0MsRUFBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQ3JGLEtBQUssRUFBRTtZQUNMLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxhQUFhO1lBQ25DLFlBQVksRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVE7U0FDeEM7S0FDRixDQUFDLENBQUE7SUFFRixNQUFNLEVBQ0osSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQ2YsR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDcEIsTUFBTSxFQUFFLGtCQUFrQjtRQUMxQixNQUFNLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNO1FBQzlCLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRSxFQUFFO0tBQzdCLENBQUMsQ0FBQTtJQUVGLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7QUFDM0MsQ0FBQyJ9