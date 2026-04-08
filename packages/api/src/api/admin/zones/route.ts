import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createZoneWorkflow, CreateZoneWorkflowInput } from "../../../workflows/zone/workflows/create-zone"
import { AdminCreateZoneType } from "./validators"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const filterableFields = req.filterableFields || {}
    const { q, ...restFilters } = filterableFields as Record<string, unknown> & {
      q?: string
    }

    const filters: Record<string, unknown> = { ...restFilters }

    if (q && typeof q === "string" && q.trim().length > 0) {
      const search = `%${q.trim()}%`
      const postcodeValue = q.trim()
      filters.$or = [
        { name: { $ilike: search } },
        { description: { $ilike: search } },
        { postcodes: { $contains: [postcodeValue] } },
      ]
    }

    const { data: zones, metadata } = await query.graph({
      entity: "zone",
      fields: ["*"],
      filters,
      pagination: req.queryConfig.pagination,
    })

    const locationIds = [
      ...new Set(zones?.map((zone: Record<string, unknown>) => zone.location_id as string).filter(Boolean)),
    ]

    const locationsMap = new Map<string, string>()
    if (locationIds.length > 0) {
      const { data: locations } = await query.graph({
        entity: "stock_location",
        fields: ["id", "name"],
        filters: { id: locationIds },
      })

      locations?.forEach((location: Record<string, unknown>) => {
        locationsMap.set(location.id as string, location.name as string)
      })
    }

    const zonesWithLocation = zones?.map((zone: Record<string, unknown>) => ({
      ...zone,
      location_name: locationsMap.get(zone.location_id as string) || "Unknown Location",
    }))

    res.json({
      zones: zonesWithLocation,
      count: metadata?.count,
      offset: metadata?.skip,
      limit: metadata?.take,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch zones",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  try {
    const workflowInput: CreateZoneWorkflowInput = {
      ...(req.validatedBody as AdminCreateZoneType),
      created_by: req.auth_context.actor_id,
      updated_by: req.auth_context.actor_id,
    }

    const { result } = await createZoneWorkflow(req.scope).run({
      input: workflowInput,
    })

    res.status(201).json({
      message: "Zone created successfully",
      zone: result,
    })
  } catch (error) {
    res.status(500).json({
      error: "Failed to create zone",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
