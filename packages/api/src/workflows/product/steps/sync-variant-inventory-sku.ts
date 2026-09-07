import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { Knex } from "knex"

export const syncVariantInventorySkuStepId = "sync-variant-inventory-sku"

// =========================================================================
// Types & Interfaces
// =========================================================================

export interface SyncVariantInventorySkuStepInput {
    products: Array<{ id: string; handle?: string }>
}

export interface SyncVariantInventorySkuStepResult {
    synced: number
    skipped: number
    details: Array<{
        variantId: string
        inventoryItemId: string
        oldSku: string
        newSku: string
    }>
}

interface CompensationData {
    previousSkus: Array<{
        inventoryItemId: string
        previousSku: string
    }>
}

interface VariantInventorySkuRow {
    variant_id: string
    variant_sku: string | null
    inventory_item_id: string
    inventory_item_sku: string | null
}

// =========================================================================
// Main Step Definition
// =========================================================================

/**
 * Syncs SKU from product_variant to linked inventory_item when they differ.
 * 
 * This fixes a Medusa framework gap where updateProductsWorkflow updates
 * product_variant.sku but does not propagate the change to the linked
 * inventory_item.sku.
 */
export const syncVariantInventorySkuStep = createStep(
    syncVariantInventorySkuStepId,

    async (input: SyncVariantInventorySkuStepInput, { container }) => {
        const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
        const logger = container.resolve("logger")
        const compensationData: CompensationData = { previousSkus: [] }

        try {
            const productIds = input.products.map(p => p.id)
            if (productIds.length === 0) {
                return new StepResponse(
                    { synced: 0, skipped: 0, details: [] } as SyncVariantInventorySkuStepResult,
                    { previousSkus: [] }
                )
            }

            // Get all variant → inventory item SKU pairs with mismatches
            const mismatches = await getMismatchedSkus(productIds, knex)

            if (mismatches.length === 0) {
                logger.info(`🔄 [SKU_SYNC] No SKU mismatches found for ${productIds.length} products`)
                return new StepResponse(
                    { synced: 0, skipped: 0, details: [] } as SyncVariantInventorySkuStepResult,
                    { previousSkus: [] }
                )
            }

            logger.info(`🔄 [SKU_SYNC] Found ${mismatches.length} SKU mismatches to sync`)

            // Save previous SKUs for compensation
            compensationData.previousSkus = mismatches.map(m => ({
                inventoryItemId: m.inventory_item_id,
                previousSku: m.inventory_item_sku || ""
            }))

            // Batch update all mismatched inventory items in a single query
            // Uses UPDATE FROM VALUES — no re-joins needed since we already have the SKU mapping
            const valuesPlaceholders = mismatches.map(() => '(?, ?)').join(', ')
            const bindings = mismatches.flatMap(m => [m.inventory_item_id, m.variant_sku])

            await knex.raw(
                `UPDATE inventory_item AS ii ` +
                `SET sku = v.new_sku, updated_at = NOW() ` +
                `FROM (VALUES ${valuesPlaceholders}) AS v(id, new_sku) ` +
                `WHERE ii.id = v.id AND ii.deleted_at IS NULL`,
                bindings
            )

            const details: SyncVariantInventorySkuStepResult["details"] = mismatches.map(m => {
                logger.info(
                    `🔄 [SKU_SYNC] Synced inventory item ${m.inventory_item_id}: ` +
                    `"${m.inventory_item_sku}" → "${m.variant_sku}"`
                )
                return {
                    variantId: m.variant_id,
                    inventoryItemId: m.inventory_item_id,
                    oldSku: m.inventory_item_sku || "",
                    newSku: m.variant_sku!
                }
            })

            const result: SyncVariantInventorySkuStepResult = {
                synced: details.length,
                skipped: productIds.length - details.length,
                details
            }

            logger.info(`✅ [SKU_SYNC] Synced ${details.length} inventory item SKUs`)
            return new StepResponse(result, compensationData)

        } catch (error) {
            logger.error(`❌ [SKU_SYNC] Failed:`, error)
            throw error
        }
    },

    // Compensation: restore previous SKUs
    async (compensationData: CompensationData | undefined, { container }) => {
        if (!compensationData || compensationData.previousSkus.length === 0) return

        const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
        const logger = container.resolve("logger")

        logger.info(`🔄 [SKU_SYNC] Rolling back ${compensationData.previousSkus.length} SKU changes`)

        try {
            // Batch rollback using parameterized UPDATE FROM VALUES
            const valuesPlaceholders = compensationData.previousSkus.map(() => '(?, ?)').join(', ')
            const bindings = compensationData.previousSkus.flatMap(p => [
                p.inventoryItemId,
                p.previousSku || null
            ])

            await knex.raw(
                `UPDATE inventory_item AS ii ` +
                `SET sku = v.old_sku, updated_at = NOW() ` +
                `FROM (VALUES ${valuesPlaceholders}) AS v(id, old_sku) ` +
                `WHERE ii.id = v.id AND ii.deleted_at IS NULL`,
                bindings
            )

            logger.info(`✅ [SKU_SYNC] Rollback completed`)
        } catch (error) {
            logger.error(`❌ [SKU_SYNC] Rollback failed:`, error)
        }
    }
)

// =========================================================================
// Query Logic
// =========================================================================

/**
 * Finds all variant → inventory item pairs where SKU differs.
 * Uses a single JOIN query for efficiency.
 */
async function getMismatchedSkus(
    productIds: string[],
    knex: Knex
): Promise<VariantInventorySkuRow[]> {
    if (productIds.length === 0) return []

    return knex("product_variant as pv")
        .join("product_variant_inventory_item as pvii", function () {
            this.on("pvii.variant_id", "=", "pv.id")
                .andOn(knex.raw("pvii.deleted_at IS NULL"))
        })
        .join("inventory_item as ii", function () {
            this.on("ii.id", "=", "pvii.inventory_item_id")
                .andOn(knex.raw("ii.deleted_at IS NULL"))
        })
        .whereIn("pv.product_id", productIds)
        .whereNull("pv.deleted_at")
        .whereNotNull("pv.sku")
        .whereRaw("(pv.sku != ii.sku OR ii.sku IS NULL)")
        .select([
            "pv.id as variant_id",
            "pv.sku as variant_sku",
            "pvii.inventory_item_id as inventory_item_id",
            "ii.sku as inventory_item_sku"
        ])
}
