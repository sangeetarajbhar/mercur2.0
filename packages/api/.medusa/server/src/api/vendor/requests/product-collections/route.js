"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const workflows_1 = require("../../../../workflows/requests/workflows");
async function GET(req, res) {
    const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const { data: entities, metadata } = await query.graph({
        entity: "product_collection",
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
    const { result: collection } = await (0, workflows_1.createProductCollectionRequestWorkflow)(req.scope).run({
        input: {
            product_collection: req.validatedBody,
            submitter_id: req.auth_context.actor_id,
        },
    });
    const { data: [entity], } = await query.graph({
        entity: "product_collection",
        fields: req.queryConfig.fields,
        filters: { id: collection.id },
    });
    res.status(201).json({ request: entity });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3ZlbmRvci9yZXF1ZXN0cy9wcm9kdWN0LWNvbGxlY3Rpb25zL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBT0Esa0JBbUJDO0FBRUQsb0JBc0JDO0FBakRELHFEQUFxRTtBQUdyRSx3RUFBaUc7QUFHMUYsS0FBSyxVQUFVLEdBQUcsQ0FDdkIsR0FBNkUsRUFDN0UsR0FBOEM7SUFFOUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFaEUsTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQ3JELE1BQU0sRUFBRSxvQkFBb0I7UUFDNUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTTtRQUM5QixPQUFPLEVBQUUsR0FBRyxDQUFDLGdCQUFnQjtRQUM3QixVQUFVLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxVQUFVO0tBQ3ZDLENBQUMsQ0FBQTtJQUVGLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDUCxRQUFRLEVBQUUsUUFBUTtRQUNsQixLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDO1FBQzNCLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUM7UUFDM0IsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLElBQUksQ0FBQztLQUMzQixDQUFDLENBQUE7QUFDSixDQUFDO0FBRU0sS0FBSyxVQUFVLElBQUksQ0FDeEIsR0FBeUUsRUFDekUsR0FBMEM7SUFFMUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFaEUsTUFBTSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxNQUFNLElBQUEsa0RBQXNDLEVBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUN6RixLQUFLLEVBQUU7WUFDTCxrQkFBa0IsRUFBRSxHQUFHLENBQUMsYUFBYTtZQUNyQyxZQUFZLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRO1NBQ3hDO0tBQ0YsQ0FBQyxDQUFBO0lBRUYsTUFBTSxFQUNKLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUNmLEdBQUcsTUFBTSxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQ3BCLE1BQU0sRUFBRSxvQkFBb0I7UUFDNUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTTtRQUM5QixPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsVUFBVSxDQUFDLEVBQUUsRUFBRTtLQUMvQixDQUFDLENBQUE7SUFFRixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0FBQzNDLENBQUMifQ==