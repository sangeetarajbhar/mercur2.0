import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { CONTROLS_MODULE } from '../../../../modules/controls'
import ControlModuleService from '../../../../modules/controls/service'
import { uploadToS3WithPath } from "../../../../shared/utils"
import { constructS3Url } from "../../../../shared/utils/common"

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
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const controlService = req.scope.resolve(CONTROLS_MODULE) as ControlModuleService
    const controlId = req.params.id
    
    // Use listControls with id filter to get a single control
    const controls = await controlService.listControls({ id: controlId })
    
    if (!controls || controls.length === 0) {
      return res.status(404).json({
        error: "Control not found"
      })
    }
    
    const control = controls[0] as any
    const enriched = {
      ...control,
      message_icon_url: control?.message_icon ? constructS3Url(control.message_icon) : null,
    }

    res.json({
      control: enriched
    })
    
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch control",
      details: error instanceof Error ? error.message : String(error)
    })
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
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const controlService = req.scope.resolve(CONTROLS_MODULE) as ControlModuleService
    const controlId = req.params.id

    // Include the id in the update data
    const body: any = req.validatedBody || {}

    // Handle inline message icon upload (PNG/JPEG/SVG)
    if (body.message_icon_file && body.message_icon_file.base64Content && body.message_icon_file.file?.type) {
      const allowed = ["image/png", "image/jpeg", "image/svg+xml"]
      if (!allowed.includes(body.message_icon_file.file.type)) {
        return res.status(400).json({ error: "Unsupported image type" })
      }
      const base64 = body.message_icon_file.base64Content.split(',')[1] || body.message_icon_file.base64Content
      const buffer = Buffer.from(base64, 'base64')
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const ext = body.message_icon_file.file.type === 'image/png' ? 'png' : body.message_icon_file.file.type === 'image/svg+xml' ? 'svg' : 'jpg'
      const fileNameWithPath = `controls/icons/${ym}/message_icon_${controlId}_${Date.now()}_${d}.${ext}`

      await uploadToS3WithPath(fileNameWithPath, buffer, body.message_icon_file.file.type)
      body.message_icon = fileNameWithPath
      delete body.message_icon_file
    }

    const updatePayload = {
      id: controlId,
      ...body,
      updated_by: req.auth_context.actor_id
    }
    
    const updatedControl = await controlService.updateControls(updatePayload)
    
    res.json({
      control: updatedControl
    })
    
  } catch (error) {
    res.status(500).json({
      error: "Failed to update control",
      details: error instanceof Error ? error.message : String(error)
    })
  }
}
