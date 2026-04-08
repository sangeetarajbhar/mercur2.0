"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const workflows_1 = require("../../../../../../workflows/requests/workflows");
async function POST(req, res) {
    const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const alias = req.params.type;
    const entityId = req.params.id;
    await (0, workflows_1.rejectRequestWorkflow)(req.scope).run({
        input: {
            alias,
            entity_id: entityId,
            reviewer_id: req.auth_context.actor_id,
            reviewer_note: req.validatedBody?.reviewer_note,
        },
    });
    const { data: [entity], } = await query.graph({
        entity: alias,
        fields: ["id", "custom_fields.*"],
        filters: { id: entityId },
    });
    res.json({ request: entity });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3JlcXVlc3RzL1t0eXBlXS9baWRdL3JlamVjdC9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQU9BLG9CQTJCQztBQWpDRCxxREFBcUU7QUFHckUsOEVBQXNGO0FBRy9FLEtBQUssVUFBVSxJQUFJLENBQ3hCLEdBQW9ELEVBQ3BELEdBQXlDO0lBRXpDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGlDQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBRWhFLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSyxDQUFBO0lBQzlCLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRyxDQUFBO0lBRS9CLE1BQU0sSUFBQSxpQ0FBcUIsRUFBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQ3pDLEtBQUssRUFBRTtZQUNMLEtBQUs7WUFDTCxTQUFTLEVBQUUsUUFBUTtZQUNuQixXQUFXLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRO1lBQ3RDLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxFQUFFLGFBQWE7U0FDaEQ7S0FDRixDQUFDLENBQUE7SUFFRixNQUFNLEVBQ0osSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQ2YsR0FBRyxNQUFNLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDcEIsTUFBTSxFQUFFLEtBQUs7UUFDYixNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUM7UUFDakMsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRTtLQUMxQixDQUFDLENBQUE7SUFFRixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7QUFDL0IsQ0FBQyJ9