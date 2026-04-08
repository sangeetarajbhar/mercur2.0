"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const utils_1 = require("@medusajs/framework/utils");
const controls_1 = require("../../../modules/controls");
const utils_2 = require("../../../shared/utils");
const common_1 = require("../../../shared/utils/common");
/**
 * @oas [get] /admin/controls
 * operationId: "AdminListControls"
 * summary: "List controls"
 * description: "Retrieves controls list"
 * x-authenticated: true
 * parameters:
 *   - in: query
 *     name: limit
 *     schema:
 *       type: number
 *     description: The number of items to return. Default 50.
 *   - in: query
 *     name: offset
 *     schema:
 *       type: number
 *     description: The number of items to skip before starting the response. Default 0.
 *   - name: scope
 *     in: query
 *     schema:
 *       type: string
 *       enum: [zone, darkstore]
 *     required: false
 *     description: Filter by control scope
 *   - name: q
 *     in: query
 *     schema:
 *       type: string
 *     required: false
 *     description: Search query for controls
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             controls:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Control"
 *             count:
 *               type: integer
 *               description: The total number of controls
 *             offset:
 *               type: integer
 *               description: The number of controls skipped
 *             limit:
 *               type: integer
 *               description: The number of controls per page
 * tags:
 *   - Admin
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
async function GET(req, res) {
    try {
        const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
        const filterableFields = req.filterableFields || {};
        const { q, ...restFilters } = filterableFields;
        const filters = { ...restFilters };
        if (q && typeof q === 'string' && q.trim().length > 0) {
            const search = `%${q.trim()}%`;
            filters.$or = [
                { scope_id: { $ilike: search } },
                { delay_message: { $ilike: search } },
            ];
        }
        const { data: controls, metadata } = await query.graph({
            entity: 'control',
            fields: ['*'],
            filters,
            pagination: req.queryConfig.pagination,
        });
        // Build name maps for zones and stock locations used in the current page of controls
        const zoneIds = new Set();
        const locationIds = new Set();
        const controlRecords = (controls || []);
        controlRecords.forEach((c) => {
            if (c?.scope === 'zone' && c.scope_id)
                zoneIds.add(c.scope_id);
            if (c?.scope === 'darkstore' && c.scope_id)
                locationIds.add(c.scope_id);
        });
        const zoneNameMap = new Map();
        const locationNameMap = new Map();
        if (zoneIds.size > 0) {
            const { data: zones } = await query.graph({
                entity: 'zone',
                fields: ['id', 'name'],
                filters: { id: Array.from(zoneIds) },
            });
            zones?.forEach((z) => {
                if (z?.id)
                    zoneNameMap.set(z.id, z.name ?? '');
            });
        }
        if (locationIds.size > 0) {
            const { data: locations } = await query.graph({
                entity: 'stock_location',
                fields: ['id', 'name'],
                filters: { id: Array.from(locationIds) },
            });
            locations?.forEach((l) => {
                if (l?.id)
                    locationNameMap.set(l.id, l.name ?? '');
            });
        }
        const enriched = controlRecords.map((c) => ({
            ...c,
            scope_name: c.scope === 'zone'
                ? (zoneNameMap.get(c.scope_id ?? '') || null)
                : c.scope === 'darkstore'
                    ? (locationNameMap.get(c.scope_id ?? '') || null)
                    : null,
            message_icon_url: c.message_icon ? (0, common_1.constructS3Url)(c.message_icon) : null,
        }));
        res.json({
            controls: enriched,
            count: metadata?.count || 0,
            offset: metadata?.skip || 0,
            limit: metadata?.take || 50
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to fetch controls",
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
/**
 * @oas [post] /admin/controls
 * operationId: "AdminCreateControl"
 * summary: "Create a control"
 * description: "Creates a new control"
 * x-authenticated: true
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         required:
 *           - scope
 *           - scope_id
 *         properties:
 *           scope:
 *             type: string
 *             enum: [zone, darkstore]
 *           scope_id:
 *             type: string
 *           is_active:
 *             type: boolean
 *             default: true
 *           is_instant_enabled:
 *             type: boolean
 *             default: true
 *           is_slotted_enabled:
 *             type: boolean
 *             default: true
 *           delay_seconds:
 *             type: number
 *             default: 0
 *           delay_message:
 *             type: string
 *             nullable: true
 *           reason:
 *             type: object
 *             default: {}
 * responses:
 *   "201":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             control:
 *               $ref: "#/components/schemas/Control"
 * tags:
 *   - Admin
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
async function POST(req, res) {
    try {
        const controlService = req.scope.resolve(controls_1.CONTROLS_MODULE);
        const body = {
            ...req.validatedBody,
        };
        const messageIconFile = body.message_icon_file;
        // Handle inline message icon upload (PNG/JPEG/SVG)
        if (messageIconFile?.base64Content && messageIconFile.file?.type) {
            const allowed = ["image/png", "image/jpeg", "image/svg+xml"];
            if (!allowed.includes(messageIconFile.file.type)) {
                return res.status(400).json({ error: "Unsupported image type" });
            }
            const base64 = messageIconFile.base64Content.split(',')[1] || messageIconFile.base64Content;
            const buffer = Buffer.from(base64, 'base64');
            const now = new Date();
            const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const ext = messageIconFile.file.type === 'image/png' ? 'png' : messageIconFile.file.type === 'image/svg+xml' ? 'svg' : 'jpg';
            const fileNameWithPath = `controls/icons/${ym}/message_icon_${Date.now()}_${d}.${ext}`;
            await (0, utils_2.uploadToS3WithPath)(fileNameWithPath, buffer, messageIconFile.file.type);
            body["message_icon"] = fileNameWithPath;
            delete body["message_icon_file"];
        }
        const controlData = {
            ...body,
            created_by: req.auth_context.actor_id,
            updated_by: req.auth_context.actor_id
        };
        const control = await controlService.createControls(controlData);
        res.status(201).json({
            message: "Control created successfully",
            control
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to create control",
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2NvbnRyb2xzL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBaUVBLGtCQTRGQztBQXlERCxvQkFzREM7QUEzUUQscURBQXFFO0FBRXJFLHdEQUEyRDtBQUUzRCxpREFBMEQ7QUFDMUQseURBQTZEO0FBRTdEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXdERztBQUNJLEtBQUssVUFBVSxHQUFHLENBQUMsR0FBMkQsRUFBRSxHQUFtQjtJQUN4RyxJQUFJLENBQUM7UUFDSCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVoRSxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFLENBQUE7UUFDbkQsTUFBTSxFQUFFLENBQUMsRUFBRSxHQUFHLFdBQVcsRUFBRSxHQUFHLGdCQUU3QixDQUFBO1FBRUQsTUFBTSxPQUFPLEdBQTRCLEVBQUUsR0FBRyxXQUFXLEVBQUUsQ0FBQTtRQUUzRCxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN0RCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFBO1lBQzlCLE9BQU8sQ0FBQyxHQUFHLEdBQUc7Z0JBQ1osRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ2hDLEVBQUUsYUFBYSxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO2FBQ3RDLENBQUE7UUFDSCxDQUFDO1FBRUQsTUFBTSxFQUFFLElBQUksRUFB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