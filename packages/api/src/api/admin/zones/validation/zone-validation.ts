import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CreateBulkSlotDefinitionSchema } from "../validators"
import ZoneModuleService from "../../../../modules/zone/service"
import { ZONE_MODULE } from "../../../../modules/zone"

export function validateSlotDefinitionMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const validatedBody = CreateBulkSlotDefinitionSchema.parse(req.body)
    req.validatedBody = validatedBody
    next()
  } catch (error: unknown) {
    const zodError = error as { errors?: Array<{ message: string }>; message?: string }
    const errorMessages =
      zodError.errors?.map((e) => e.message).join("; ") || zodError.message || "Validation error"
    return res.status(400).json({
      type: "invalid_data",
      message: `Invalid request: ${errorMessages}`,
    })
  }
}

export async function validateUniquePostcodesMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    debugger

    const zoneService = req.scope.resolve<ZoneModuleService>(ZONE_MODULE)

    const body = (req.validatedBody || req.body) as {
      postcodes?: string[]
      location_id?: string
    }

    const zoneId = (req.params as { id?: string })?.id
    const inputPostcodes = Array.isArray(body?.postcodes) ? body.postcodes : []

    if (!inputPostcodes.length) {
      return next()
    }

    const zones = await zoneService.listZones({})

    if (zones?.length) {
      const normalized = new Set(inputPostcodes.map((p) => String(p).trim().toLowerCase()))
      for (const z of zones) {
        if (zoneId && z.id === zoneId) continue

        const zPostcodes: string[] = Array.isArray(z.postcodes) ? z.postcodes : []
        const overlap = zPostcodes.some((p) => normalized.has(String(p).trim().toLowerCase()))
        if (overlap) {
          return res.status(400).json({
            type: "invalid_data",
            message: "One or more postcodes are already assigned to another zone",
          })
        }
      }
    }

    next()
  } catch (error) {
    return res.status(500).json({
      error: "Failed to validate unique postcodes",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
