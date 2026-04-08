import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminGetControlsParamsType } from './validators'
import { CONTROLS_MODULE } from '../../../modules/controls'
import ControlModuleService from '../../../modules/controls/service'
import { uploadToS3WithPath } from "../../../shared/utils"
import { constructS3Url } from "../../../shared/utils/common"

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
export async function GET(req: AuthenticatedMedusaRequest<AdminGetControlsParamsType>, res: MedusaResponse) {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const filterableFields = req.filterableFields || {}
    const { q, ...restFilters } = filterableFields as Record<string, unknown> & {
      q?: string
    }

    const filters: Record<string, unknown> = { ...restFilters }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const search = `%${q.trim()}%`
      filters.$or = [
        { scope_id: { $ilike: search } },
        { delay_message: { $ilike: search } },
      ]
    }
    
    const { data: controls, metadata } = await query.graph({
      entity: 'control',
      fields: ['*'],
      filters,
      pagination: req.queryConfig.pagination,
    })
    
    // Build name maps for zones and stock locations used in the current page of controls
    const zoneIds = new Set<string>()
    const locationIds = new Set<string>()
    type ControlRecord = {
      id?: string
      scope?: string
      scope_id?: string
      message_icon?: string | null
      delay_message?: string | null
      [key: string]: unknown
    }

    const controlRecords = (controls || []) as ControlRecord[]

    controlRecords.forEach((c) => {
      if (c?.scope === 'zone' && c.scope_id) zoneIds.add(c.scope_id)
      if (c?.scope === 'darkstore' && c.scope_id) locationIds.add(c.scope_id)
    })

    const zoneNameMap = new Map<string, string>()
    const locationNameMap = new Map<string, string>()

    if (zoneIds.size > 0) {
      const { data: zones } = await query.graph({
        entity: 'zone',
        fields: ['id', 'name'],
        filters: { id: Array.from(zoneIds) },
      }) as { data?: Array<{ id?: string; name?: string | null }> }
      zones?.forEach((z) => {
        if (z?.id) zoneNameMap.set(z.id, z.name ?? '')
      })
    }

    if (locationIds.size > 0) {
      const { data: locations } = await query.graph({
        entity: 'stock_location',
        fields: ['id', 'name'],
        filters: { id: Array.from(locationIds) },
      }) as { data?: Array<{ id?: string; name?: string | null }> }
      locations?.forEach((l) => {
        if (l?.id) locationNameMap.set(l.id, l.name ?? '')
      })
    }

    const enriched = controlRecords.map((c) => ({
      ...c,
      scope_name: c.scope === 'zone'
        ? (zoneNameMap.get(c.scope_id ?? '') || null)
        : c.scope === 'darkstore'
        ? (locationNameMap.get(c.scope_id ?? '') || null)
        : null,
      message_icon_url: c.message_icon ? constructS3Url(c.message_icon) : null,
    }))

    res.json({ 
      controls: enriched, 
      count: metadata?.count || 0, 
      offset: metadata?.skip || 0, 
      limit: metadata?.take || 50 
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch controls",
      details: error instanceof Error ? error.message : String(error)
    })
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
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const controlService = req.scope.resolve(CONTROLS_MODULE) as ControlModuleService
    
    type MessageIconFile = {
      base64Content?: string
      file?: {
        type?: string
      }
    }

    const body = {
      ...(req.validatedBody as Record<string, unknown> | undefined),
    } as Record<string, unknown>

    const messageIconFile = body.message_icon_file as MessageIconFile | undefined

    // Handle inline message icon upload (PNG/JPEG/SVG)
    if (messageIconFile?.base64Content && messageIconFile.file?.type) {
      const allowed = ["image/png", "image/jpeg", "image/svg+xml"]
      if (!allowed.includes(messageIconFile.file.type)) {
        return res.status(400).json({ error: "Unsupported image type" })
      }
      const base64 = messageIconFile.base64Content.split(',')[1] || messageIconFile.base64Content
      const buffer = Buffer.from(base64, 'base64')
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const ext = messageIconFile.file.type === 'image/png' ? 'png' : messageIconFile.file.type === 'image/svg+xml' ? 'svg' : 'jpg'
      const fileNameWithPath = `controls/icons/${ym}/message_icon_${Date.now()}_${d}.${ext}`

      await uploadToS3WithPath(fileNameWithPath, buffer, messageIconFile.file.type)
      body["message_icon"] = fileNameWithPath
      delete body["message_icon_file"]
    }

    const controlData = {
      ...body,
      created_by: req.auth_context.actor_id,
      updated_by: req.auth_context.actor_id
    }
    
    const control = await controlService.createControls(controlData)
    
    res.status(201).json({
      message: "Control created successfully",
      control
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to create control",
      details: error instanceof Error ? error.message : String(error)
    })
  }
}


