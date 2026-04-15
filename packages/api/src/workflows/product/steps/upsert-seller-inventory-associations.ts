import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { LinkDefinition, IInventoryService } from "@medusajs/framework/types"
import { Knex } from "knex"
import { MercurModules } from "@mercurjs/types"
const SELLER_MODULE = MercurModules.SELLER

export const upsertSellerInventoryAssociationsStepId = "upsert-seller-inventory-associations"

// =========================================================================
// Types & Interfaces
// =========================================================================

export interface UpsertSellerInventoryAssociationsStepInput {
    products: Array<{ id: string; handle?: string }>
    sellerId: string
    transactionId?: string
}

export interface UpsertSellerInventoryAssociationsStepResult {
    created: number
    skipped: number
    inventoryItemsCreated: number
    inventoryItemsProcessed: string[]
}

interface CompensationData {
    createdSellerLinks: LinkDefinition[]
    createdInventoryItemIds: string[]
    createdVariantInventoryLinkIds: string[]
}

interface VariantDetails {
    id: string
    sku: string | null
    manage_inventory: boolean
    origin_country?: string
    mid_code?: string
    material?: string
    weight?: number
    length?: number
    height?: number
    width?: number
    title?: string
    hs_code?: string
}

interface VariantInventoryLink {
    variant_id: string
    inventory_item_id: string
    required_quantity: number
}

interface StepContext {
    knex: Knex
    remoteLink: any
    inventoryService: IInventoryService
    logger: any
}

// =========================================================================
// Main Step Definition
// =========================================================================

/**
 * Creates inventory items for variants that don't have them, links them,
 * then creates seller associations.
 */
export const upsertSellerInventoryAssociationsStep = createStep(
    upsertSellerInventoryAssociationsStepId,
    upsertSellerInventoryAssociationsStepHandler,
    compensateSellerInventoryAssociationsStepHandler
)

export async function upsertSellerInventoryAssociationsStepHandler(
    input: UpsertSellerInventoryAssociationsStepInput,
    { container }: { container: any }
): Promise<StepResponse<UpsertSellerInventoryAssociationsStepResult, CompensationData>> {
    const ctx = resolveServices(container)
    const compensationData = createEmptyCompensationData()

    try {
        ctx.logger.info(`🔗 [SELLER_INVENTORY] Processing for ${input.products.length} products, seller: ${input.sellerId}`)

        // Step 1: Get variants that need processing
        const variants = await getVariantsWithDetails(input.products, ctx)
        if (variants.length === 0) {
            return earlyReturn("No variants found", compensationData, ctx)
        }

        // Step 2: Ensure all variants have inventory items (returns mappings to avoid redundant query)
        const { createdInventoryItems, allInventoryMappings } = await ensureVariantsHaveInventoryItems(
            variants, ctx, compensationData
        )

        // Step 3: Extract inventory item IDs from cached mappings
        const allInventoryItemIds = allInventoryMappings.map(m => m.inventory_item_id)
        if (allInventoryItemIds.length === 0) {
            return earlyReturn("No inventory items after creation", compensationData, ctx, createdInventoryItems.length)
        }
        ctx.logger.info(`🔗 [SELLER_INVENTORY] Total inventory items: ${allInventoryItemIds.length}`)

        // Step 4: Create seller associations
        const { created, skipped } = await createSellerAssociations(
            allInventoryItemIds, input.sellerId, ctx, compensationData
        )

        const result: UpsertSellerInventoryAssociationsStepResult = {
            created,
            skipped,
            inventoryItemsCreated: createdInventoryItems.length,
            inventoryItemsProcessed: allInventoryItemIds
        }

        ctx.logger.info(`✅ [SELLER_INVENTORY] Completed: created=${created}, skipped=${skipped}, inv_created=${createdInventoryItems.length}`)
        return new StepResponse(result, compensationData)

    } catch (error) {
        ctx.logger.error(`❌ [SELLER_INVENTORY] Failed:`, error)
        throw error
    }
}

async function compensateSellerInventoryAssociationsStepHandler(
    compensationData: CompensationData | undefined,
    { container }: { container: any }
) {
    if (!compensationData) return

    const ctx = resolveServices(container)
    await rollbackSellerLinks(compensationData.createdSellerLinks, ctx)
    await rollbackVariantInventoryLinks(compensationData.createdVariantInventoryLinkIds, ctx)
    await rollbackInventoryItems(compensationData.createdInventoryItemIds, ctx)

    ctx.logger.info(`✅ [SELLER_INVENTORY] Full rollback completed`)
}

// =========================================================================
// Service Resolution
// =========================================================================

function resolveServices(container: any): StepContext {
    return {
        knex: container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Knex,
        remoteLink: container.resolve(ContainerRegistrationKeys.LINK),
        inventoryService: container.resolve(Modules.INVENTORY) as IInventoryService,
        logger: container.resolve("logger")
    }
}

function createEmptyCompensationData(): CompensationData {
    return {
        createdSellerLinks: [],
        createdInventoryItemIds: [],
        createdVariantInventoryLinkIds: []
    }
}

function earlyReturn(
    reason: string,
    compensationData: CompensationData,
    ctx: StepContext,
    inventoryItemsCreated: number = 0
): StepResponse<UpsertSellerInventoryAssociationsStepResult, CompensationData> {
    ctx.logger.warn(`⚠️ [SELLER_INVENTORY] ${reason}`)
    return new StepResponse(
        { created: 0, skipped: 0, inventoryItemsCreated, inventoryItemsProcessed: [] },
        compensationData
    )
}

// =========================================================================
// Step 1: Get Variants
// =========================================================================

async function getVariantsWithDetails(
    products: Array<{ id: string }>,
    ctx: StepContext
): Promise<VariantDetails[]> {
    const productIds = products.map(p => p.id)

    const variants = await ctx.knex("product_variant")
        .whereIn("product_id", productIds)
        .whereNull("deleted_at")
        .select([
            "id", "sku", "manage_inventory", "origin_country", "mid_code",
            "material", "weight", "length", "height", "width", "title", "hs_code"
        ])

    ctx.logger.info(`🔗 [SELLER_INVENTORY] Found ${variants.length} variants`)
    return variants
}

// =========================================================================
// Step 2: Ensure Variants Have Inventory Items
// =========================================================================

async function ensureVariantsHaveInventoryItems(
    variants: VariantDetails[],
    ctx: StepContext,
    compensationData: CompensationData
): Promise<{
    createdInventoryItems: Array<{ id: string; sku?: string | null }>
    allInventoryMappings: Array<{ variant_id: string; inventory_item_id: string }>
}> {
    // Get initial inventory mappings (single query, reused later)
    const initialMappings = await getInventoryMappingsForVariants(variants.map(v => v.id), ctx)
    const variantIdsWithInventory = new Set(initialMappings.map(m => m.variant_id))

    // Find variants missing inventory items
    const variantsMissingInventory = variants.filter(
        v => v.manage_inventory && !variantIdsWithInventory.has(v.id)
    )
    ctx.logger.info(`🔗 [SELLER_INVENTORY] Variants missing inventory: ${variantsMissingInventory.length}`)

    if (variantsMissingInventory.length === 0) {
        ctx.logger.info(`🔗 [SELLER_INVENTORY] All variants have inventory items`)
        return { createdInventoryItems: [], allInventoryMappings: initialMappings }
    }

    // Build SKU lookup from existing inventory items
    const skuToInventoryItem = await buildExistingSkuLookup(variantsMissingInventory, ctx)

    // Create new inventory items for variants that need them
    const createdInventoryItems = await createMissingInventoryItems(
        variantsMissingInventory, skuToInventoryItem, ctx, compensationData
    )

    // Update lookup with newly created items
    addCreatedItemsToLookup(createdInventoryItems, skuToInventoryItem)

    // Create variant-inventory links
    await createVariantInventoryLinks(variantsMissingInventory, skuToInventoryItem, createdInventoryItems, ctx, compensationData)

    // Re-fetch mappings after creating links (single query replaces redundant call)
    const finalMappings = await getInventoryMappingsForVariants(variants.map(v => v.id), ctx)

    return { createdInventoryItems, allInventoryMappings: finalMappings }
}

async function buildExistingSkuLookup(
    variants: VariantDetails[],
    ctx: StepContext
): Promise<Map<string, string>> {
    const skuToId = new Map<string, string>()
    const skusToCheck = variants.filter(v => v.sku).map(v => v.sku!)

    if (skusToCheck.length === 0) return skuToId

    const existingItems = await ctx.knex("inventory_item")
        .whereIn("sku", skusToCheck)
        .whereNull("deleted_at")
        .select(["id", "sku"])

    for (const item of existingItems) {
        skuToId.set(item.sku, item.id)
    }

    ctx.logger.info(`🔗 [SELLER_INVENTORY] Found ${existingItems.length} existing inventory items by SKU`)
    return skuToId
}

async function createMissingInventoryItems(
    variantsMissingInventory: VariantDetails[],
    skuToInventoryItem: Map<string, string>,
    ctx: StepContext,
    compensationData: CompensationData
): Promise<Array<{ id: string; sku?: string | null }>> {
    const { itemsToCreate, variantsForNewItems } = prepareInventoryItemsForCreation(
        variantsMissingInventory, skuToInventoryItem, ctx
    )

    if (itemsToCreate.length === 0) return []

    ctx.logger.info(`🔗 [SELLER_INVENTORY] Creating ${itemsToCreate.length} new inventory items`)
    const createdItems = await ctx.inventoryService.createInventoryItems(itemsToCreate)
    compensationData.createdInventoryItemIds = createdItems.map(item => item.id)
    ctx.logger.info(`🔗 [SELLER_INVENTORY] Created ${createdItems.length} inventory items`)

    return createdItems
}

function prepareInventoryItemsForCreation(
    variants: VariantDetails[],
    skuToInventoryItem: Map<string, string>,
    ctx: StepContext
): {
    itemsToCreate: Array<{ sku: string | null; requires_shipping: boolean;[key: string]: any }>
    variantsForNewItems: VariantDetails[]
} {
    const itemsToCreate: Array<{ sku: string | null; requires_shipping: boolean;[key: string]: any }> = []
    const variantsForNewItems: VariantDetails[] = []
    const skusBeingCreated = new Set<string>()

    for (const variant of variants) {
        // Skip if SKU already exists
        if (variant.sku && skuToInventoryItem.has(variant.sku)) continue

        // Dedupe: Skip if we're already creating an item for this SKU
        if (variant.sku && skusBeingCreated.has(variant.sku)) {
            ctx.logger.info(`🔗 [SELLER_INVENTORY] SKU ${variant.sku} already queued, will link variant ${variant.id}`)
            continue
        }

        variantsForNewItems.push(variant)
        if (variant.sku) skusBeingCreated.add(variant.sku)

        itemsToCreate.push({
            sku: variant.sku,
            origin_country: variant.origin_country,
            mid_code: variant.mid_code,
            material: variant.material,
            weight: variant.weight,
            length: variant.length,
            height: variant.height,
            width: variant.width,
            title: variant.title,
            hs_code: variant.hs_code,
            requires_shipping: true
        })
    }

    return { itemsToCreate, variantsForNewItems }
}

function addCreatedItemsToLookup(
    createdItems: Array<{ id: string; sku?: string | null }>,
    skuToInventoryItem: Map<string, string>
): void {
    for (const item of createdItems) {
        if (item.sku) {
            skuToInventoryItem.set(item.sku, item.id)
        }
    }
}

async function createVariantInventoryLinks(
    variantsMissingInventory: VariantDetails[],
    skuToInventoryItem: Map<string, string>,
    createdInventoryItems: Array<{ id: string; sku?: string | null }>,
    ctx: StepContext,
    compensationData: CompensationData
): Promise<void> {
    const links = buildVariantInventoryLinks(variantsMissingInventory, skuToInventoryItem, createdInventoryItems)

    if (links.length === 0) return

    ctx.logger.info(`🔗 [SELLER_INVENTORY] Creating ${links.length} variant-inventory links`)

    const remoteLinkDefs = links.map(link => ({
        [Modules.PRODUCT]: { variant_id: link.variant_id },
        [Modules.INVENTORY]: { inventory_item_id: link.inventory_item_id },
        data: { required_quantity: link.required_quantity }
    }))

    await ctx.remoteLink.create(remoteLinkDefs)
    compensationData.createdVariantInventoryLinkIds = links.map(l => l.variant_id)
    ctx.logger.info(`🔗 [SELLER_INVENTORY] Created ${links.length} variant-inventory links`)
}

function buildVariantInventoryLinks(
    variantsMissingInventory: VariantDetails[],
    skuToInventoryItem: Map<string, string>,
    createdInventoryItems: Array<{ id: string; sku?: string | null }>
): VariantInventoryLink[] {
    const links: VariantInventoryLink[] = []
    const linkedVariants = new Set<string>()

    // First, get the variants that had new items created for them (in order)
    const variantsForNewItems = getVariantsForNewItems(variantsMissingInventory, skuToInventoryItem)

    // Link these variants to their corresponding created items
    for (let i = 0; i < variantsForNewItems.length && i < createdInventoryItems.length; i++) {
        links.push({
            variant_id: variantsForNewItems[i].id,
            inventory_item_id: createdInventoryItems[i].id,
            required_quantity: 1
        })
        linkedVariants.add(variantsForNewItems[i].id)
    }

    // Link remaining variants (deduped or using existing SKU) to their inventory items
    for (const variant of variantsMissingInventory) {
        if (linkedVariants.has(variant.id)) continue
        if (!variant.sku || !skuToInventoryItem.has(variant.sku)) continue

        links.push({
            variant_id: variant.id,
            inventory_item_id: skuToInventoryItem.get(variant.sku)!,
            required_quantity: 1
        })
    }

    return links
}

function getVariantsForNewItems(
    variants: VariantDetails[],
    skuToInventoryItem: Map<string, string>
): VariantDetails[] {
    const result: VariantDetails[] = []
    const skusSeen = new Set<string>()

    for (const variant of variants) {
        // Skip if SKU already existed before this batch
        const existedBefore = variant.sku && skuToInventoryItem.has(variant.sku) &&
            !Array.from(skuToInventoryItem.values()).some(id => id.startsWith('created'))

        if (variant.sku && existedBefore) continue

        // Dedupe within batch
        if (variant.sku && skusSeen.has(variant.sku)) continue

        result.push(variant)
        if (variant.sku) skusSeen.add(variant.sku)
    }

    return result
}

async function getInventoryMappingsForVariants(
    variantIds: string[],
    ctx: StepContext
): Promise<Array<{ variant_id: string; inventory_item_id: string }>> {
    if (variantIds.length === 0) return []

    return ctx.knex("product_variant_inventory_item")
        .whereIn("variant_id", variantIds)
        .whereNull("deleted_at")
        .select(["variant_id", "inventory_item_id"])
}

// =========================================================================
// Step 4: Create Seller Associations
// =========================================================================

async function createSellerAssociations(
    inventoryItemIds: string[],
    sellerId: string,
    ctx: StepContext,
    compensationData: CompensationData
): Promise<{ created: number; skipped: number }> {
    // Get existing associations
    const existingAssociations = await getExistingSellerAssociations(inventoryItemIds, sellerId, ctx)
    ctx.logger.info(`🔗 [SELLER_INVENTORY] Existing seller associations: ${existingAssociations.length}`)

    // Categorize
    const { toCreate, toSkip } = categorizeForSellerAssociations(inventoryItemIds, existingAssociations)
    ctx.logger.info(`🔗 [SELLER_INVENTORY] To create: ${toCreate.length}, to skip: ${toSkip.length}`)

    // Create new associations
    if (toCreate.length > 0) {
        const sellerLinks: LinkDefinition[] = toCreate.map(inventoryItemId => ({
            [SELLER_MODULE]: { seller_id: sellerId },
            [Modules.INVENTORY]: { inventory_item_id: inventoryItemId }
        }))

        await ctx.remoteLink.create(sellerLinks)
        compensationData.createdSellerLinks.push(...sellerLinks)
        ctx.logger.info(`🔗 [SELLER_INVENTORY] Created ${sellerLinks.length} seller-inventory associations`)
    }

    return { created: toCreate.length, skipped: toSkip.length }
}

async function getExistingSellerAssociations(
    inventoryItemIds: string[],
    sellerId: string,
    ctx: StepContext
): Promise<Array<{ inventory_item_id: string }>> {
    if (inventoryItemIds.length === 0) return []

    return ctx.knex("seller_seller_inventory_inventory_item")
        .whereIn("inventory_item_id", inventoryItemIds)
        .where("seller_id", sellerId)
        .whereNull("deleted_at")
        .select(["inventory_item_id"])
}

function categorizeForSellerAssociations(
    inventoryItemIds: string[],
    existingAssociations: Array<{ inventory_item_id: string }>
): { toCreate: string[]; toSkip: string[] } {
    const existingSet = new Set(existingAssociations.map(a => a.inventory_item_id))

    return {
        toCreate: inventoryItemIds.filter(id => !existingSet.has(id)),
        toSkip: inventoryItemIds.filter(id => existingSet.has(id))
    }
}

// =========================================================================
// Compensation (Rollback) Functions
// =========================================================================

async function rollbackSellerLinks(links: LinkDefinition[], ctx: StepContext): Promise<void> {
    if (links.length === 0) return

    ctx.logger.info(`🔄 [SELLER_INVENTORY] Rolling back ${links.length} seller associations`)
    try {
        await ctx.remoteLink.dismiss(links)
        ctx.logger.info(`✅ [SELLER_INVENTORY] Seller links rollback completed`)
    } catch (error) {
        ctx.logger.error(`❌ [SELLER_INVENTORY] Failed to rollback seller links:`, error)
    }
}

async function rollbackVariantInventoryLinks(variantIds: string[], ctx: StepContext): Promise<void> {
    if (variantIds.length === 0) return

    ctx.logger.info(`🔄 [SELLER_INVENTORY] Rolling back ${variantIds.length} variant-inventory links`)
    try {
        const linksToRemove: LinkDefinition[] = variantIds.map(variantId => ({
            [Modules.PRODUCT]: { variant_id: variantId },
            [Modules.INVENTORY]: {}
        }))
        await ctx.remoteLink.dismiss(linksToRemove)
        ctx.logger.info(`✅ [SELLER_INVENTORY] Variant-inventory links rollback completed`)
    } catch (error) {
        ctx.logger.error(`❌ [SELLER_INVENTORY] Failed to rollback variant-inventory links:`, error)
    }
}

async function rollbackInventoryItems(itemIds: string[], ctx: StepContext): Promise<void> {
    if (itemIds.length === 0) return

    ctx.logger.info(`🔄 [SELLER_INVENTORY] Deleting ${itemIds.length} inventory items`)
    try {
        await ctx.inventoryService.deleteInventoryItems(itemIds)
        ctx.logger.info(`✅ [SELLER_INVENTORY] Inventory items deletion completed`)
    } catch (error) {
        ctx.logger.error(`❌ [SELLER_INVENTORY] Failed to delete inventory items:`, error)
    }
}
