"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const create_zone_1 = require("../../../workflows/zone/workflows/create-zone");
async function GET(req, res) {
    try {
        const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
        const filterableFields = req.filterableFields || {};
        const { q, ...restFilters } = filterableFields;
        const filters = { ...restFilters };
        if (q && typeof q === "string" && q.trim().length > 0) {
            const search = `%${q.trim()}%`;
            const postcodeValue = q.trim();
            filters.$or = [
                { name: { $ilike: search } },
                { description: { $ilike: search } },
                { postcodes: { $contains: [postcodeValue] } },
            ];
        }
        const { data: zones, metadata } = await query.graph({
            entity: "zone",
            fields: ["*"],
            filters,
            pagination: req.queryConfig.pagination,
        });
        const locationIds = [
            ...new Set(zones?.map((zone) => zone.location_id).filter(Boolean)),
        ];
        const locationsMap = new Map();
        if (locationIds.length > 0) {
            const { data: locations } = await query.graph({
                entity: "stock_location",
                fields: ["id", "name"],
                filters: { id: locationIds },
            });
            locations?.forEach((location) => {
                locationsMap.set(location.id, location.name);
            });
        }
        const zonesWithLocation = zones?.map((zone) => ({
            ...zone,
            location_name: locationsMap.get(zone.location_id) || "Unknown Location",
        }));
        res.json({
            zones: zonesWithLocation,
            count: metadata?.count,
            offset: metadata?.skip,
            limit: metadata?.take,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to fetch zones",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
async function POST(req, res) {
    try {
        const workflowInput = {
            ...req.validatedBody,
            created_by: req.auth_context.actor_id,
            updated_by: req.auth_context.actor_id,
        };
        const { result } = await (0, create_zone_1.createZoneWorkflow)(req.scope).run({
            input: workflowInput,
        });
        res.status(201).json({
            message: "Zone created successfully",
            zone: result,
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to create zone",
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3pvbmVzL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBS0Esa0JBOERDO0FBRUQsb0JBc0JDO0FBMUZELHFEQUFxRTtBQUNyRSwrRUFBMkc7QUFHcEcsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUErQixFQUFFLEdBQW1CO0lBQzVFLElBQUksQ0FBQztRQUNILE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLGlDQUF5QixDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRWhFLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixJQUFJLEVBQUUsQ0FBQTtRQUNuRCxNQUFNLEVBQUUsQ0FBQyxFQUFFLEdBQUcsV0FBVyxFQUFFLEdBQUcsZ0JBRTdCLENBQUE7UUFFRCxNQUFNLE9BQU8sR0FBNEIsRUFBRSxHQUFHLFdBQVcsRUFBRSxDQUFBO1FBRTNELElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUE7WUFDOUIsTUFBTSxhQUFhLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1lBQzlCLE9BQU8sQ0FBQyxHQUFHLEdBQUc7Z0JBQ1osRUFBRSxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQzVCLEVBQUUsV0FBVyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO2dCQUNuQyxFQUFFLFNBQVMsRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUU7YUFDOUMsQ0FBQTtRQUNILENBQUM7UUFFRCxNQUFNLEVB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