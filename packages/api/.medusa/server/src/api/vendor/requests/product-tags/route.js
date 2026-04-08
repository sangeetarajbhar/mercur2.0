"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const workflows_1 = require("../../../../workflows/requests/workflows");
async function GET(req, res) {
    const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const { data: entities, metadata } = await query.graph({
        entity: "product_tag",
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
    const { result: productTag } = await (0, workflows_1.createProductTagRequestWorkflow)(req.scope).run({
        input: {
            product_tag: req.validatedBody,
            submitter_id: req.auth_context.actor_id,
        },
    });
    const { data: [entity], } = await query.graph({
        entity: "product_tag",
        fields: req.queryConfig.fields,
        filters: { id: productTag.id },
    });
    res.status(201).json({ request: entity });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3ZlbmRvci9yZXF1ZXN0cy9wcm9kdWN0LXRhZ3Mvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFPQSxrQkFtQkM7QUFFRCxvQkFzQkM7QUFqREQscURBQXFFO0FBR3JFLHdFQUEwRjtBQUduRixLQUFLLFVBQVUsR0FBRyxDQUN2QixHQUFzRSxFQUN0RSxHQUE4QztJQUU5QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUVoRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDckQsTUFBTSxFQUFFLGFBQWE7UUFDckIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTTtRQUM5QixPQUFPLEVBQUUsR0FBRyxDQUFDLGdCQUFnQjtRQUM3QixVQUFVLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxVQUFVO0tBQ3ZDLENBQUMsQ0FBQTtJQUVGLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDUCxRQUFRLEVBQUUsUUFBUTtRQUNsQixLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssSUFBSSxDQUFDO1FBQzNCLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxJQUFJLENBQUM7UUFDM0IsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLElBQUksQ0FBQztLQUMzQixDQUFDLENBQUE7QUFDSixDQUFDO0FBRU0sS0FBSyxVQUFVLElBQUksQ0FDeEIsR0FBa0UsRUFDbEUsR0FBMEM7SUFFMUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsaUNBQXlCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFFaEUsTUFBTSxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxNQUFNLElBQUEsMkNBQStCLEVBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUNsRixLQUFLLEVBQUU7WUFDTCxXQUFXLEVBQUUsR0FBRyxDQUFDLGFBQWE7WUFDOUIsWUFBWSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUTtTQUN4QztLQUNGLENBQUMsQ0FBQTtJQUVGLE1BQU0sRUFDSixJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FDZixHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztRQUNwQixNQUFNLEVBQUUsYUFBYTtRQUNyQixNQUFNLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNO1FBQzlCLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVLENBQUMsRUFBRSxFQUFFO0tBQy9CLENBQUMsQ0FBQTtJQUVGLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7QUFDM0MsQ0FBQyJ9