"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const controls_1 = require("../../../../modules/controls");
const utils_1 = require("../../../../shared/utils");
const common_1 = require("../../../../shared/utils/common");
/**
 * @oas [get] /admin/controls/:id
 * operationId: "AdminGetControl"
 * summary: "Get a control"
 * description: "Retrieves a single control"
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     schema:
 *       type: string
 *     description: Control ID
 * responses:
 *   "200":
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
async function GET(req, res) {
    try {
        const controlService = req.scope.resolve(controls_1.CONTROLS_MODULE);
        const controlId = req.params.id;
        // Use listControls with id filter to get a single control
        const controls = await controlService.listControls({ id: controlId });
        if (!controls || controls.length === 0) {
            return res.status(404).json({
                error: "Control not found"
            });
        }
        const control = controls[0];
        const enriched = {
            ...control,
            message_icon_url: control?.message_icon ? (0, common_1.constructS3Url)(control.message_icon) : null,
        };
        res.json({
            control: enriched
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to fetch control",
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
/**
 * @oas [POST] /admin/controls/:id
 * operationId: "AdminUpdateControl"
 * summary: "Update a control"
 * description: "Updates a control"
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     schema:
 *       type: string
 *     description: Control ID
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/AdminUpdateControl"
 * responses:
 *   "200":
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
        const controlId = req.params.id;
        // Include the id in the update data
        const body = req.validatedBody || {};
        // Handle inline message icon upload (PNG/JPEG/SVG)
        if (body.message_icon_file && body.message_icon_file.base64Content && body.message_icon_file.file?.type) {
            const allowed = ["image/png", "image/jpeg", "image/svg+xml"];
            if (!allowed.includes(body.message_icon_file.file.type)) {
                return res.status(400).json({ error: "Unsupported image type" });
            }
            const base64 = body.message_icon_file.base64Content.split(',')[1] || body.message_icon_file.base64Content;
            const buffer = Buffer.from(base64, 'base64');
            const now = new Date();
            const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const ext = body.message_icon_file.file.type === 'image/png' ? 'png' : body.message_icon_file.file.type === 'image/svg+xml' ? 'svg' : 'jpg';
            const fileNameWithPath = `controls/icons/${ym}/message_icon_${controlId}_${Date.now()}_${d}.${ext}`;
            await (0, utils_1.uploadToS3WithPath)(fileNameWithPath, buffer, body.message_icon_file.file.type);
            body.message_icon = fileNameWithPath;
            delete body.message_icon_file;
        }
        const updatePayload = {
            id: controlId,
            ...body,
            updated_by: req.auth_context.actor_id
        };
        const updatedControl = await controlService.updateControls(updatePayload);
        res.json({
            control: updatedControl
        });
    }
    catch (error) {
        res.status(500).json({
            error: "Failed to update control",
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2NvbnRyb2xzL1tpZF0vcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFrQ0Esa0JBaUNDO0FBbUNELG9CQWdEQztBQXJKRCwyREFBOEQ7QUFFOUQsb0RBQTZEO0FBQzdELDREQUFnRTtBQUVoRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBMkJHO0FBQ0ksS0FBSyxVQUFVLEdBQUcsQ0FDdkIsR0FBK0IsRUFDL0IsR0FBbUI7SUFFbkIsSUFBSSxDQUFDO1FBQ0gsTUFBTSxjQUFjLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsMEJBQWUsQ0FBeUIsQ0FBQTtRQUNqRixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQTtRQUUvQiwwREFBMEQ7UUFDMUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxjQUFjLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7UUFFckUsSUFBSSxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLEtBQUssRUFBRSxtQkFBbUI7YUFDM0IsQ0FBQyxDQUFBO1FBQ0osQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQVEsQ0FBQTtRQUNsQyxNQUFNLFFBQVEsR0FBRztZQUNmLEdBQUcsT0FBTztZQUNWLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUEsdUJBQWMsRUFBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7U0FDdEYsQ0FBQTtRQUVELEdBQUcsQ0FBQyxJQUFJ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