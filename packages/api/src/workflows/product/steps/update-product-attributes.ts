import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ATTRIBUTE_MODULE } from "@mercurjs/core-plugin/modules/attribute"

export const updateProductAttributesStepId = "update-product-attributes"

/**
 * Input interface for updating product attributes
 */
export interface UpdateProductAttributesStepInput {
    products: any[]
    attributeAssignments: Array<{
        productId: string
        attributes: Array<{
            name: string;
            value: string;
            attribute_id?: string;
            handle?: string; // Add handle support
        }>
    }>
}

/**
 * Compensation data for rollback
 */
interface UpdateCompensationData {
    productId: string
    previousAttributes: Array<{ name: string; value: string; attribute_id: string; attribute_value_id: string }>
}

/**
 * Update Product Attributes Step (Ultra-simplified using MercurJS)
 *
 * ULTRA-SIMPLIFIED SELECTIVE APPROACH:
 * - Inline all logic, no helper functions
 * - Direct MercurJS calls with minimal data transformation
 * - Simple compensation based on changed attributes only
 */
export const updateProductAttributesStep = createStep(
    updateProductAttributesStepId,

    // Main execution - ultra-simplified selective updates
    async (input: UpdateProductAttributesStepInput, { container }) => {
        const attributeModuleService = container.resolve(ATTRIBUTE_MODULE)
        const linkService = container.resolve(ContainerRegistrationKeys.LINK)
        const queryService = container.resolve(ContainerRegistrationKeys.QUERY)
        const logger = container.resolve("logger")

        try {
            const productIds = input.attributeAssignments.map(a => a.productId)

            // 1. Capture current state (inline)
            const { data: products } = await queryService.graph({
                entity: "product",
                fields: ["id", "attribute_values.*", "attribute_values.attribute.*"],
                filters: { id: productIds }
            })

            // 2. Build maps for what's being updated
            // Extract attribute handles from input (attributes already have handle and attribute_id)
            const attributeHandles = [...new Set(input.attributeAssignments.flatMap(a =>
                a.attributes.map(attr => {
                    // Use handle if available, otherwise fall back to name
                    return (attr as any).handle || attr.name
                })
            ))]
            logger.info(`Attribute handles from input: [${attributeHandles.join(', ')}]`)

            const { data: attributeData } = await queryService.graph({
                entity: "attribute",
                fields: ["id", "handle"],
                filters: { handle: attributeHandles }
            })
            const attributeIdMap = new Map(attributeData.map((attr: any) => [attr.handle, attr.id]))

            // Map of productId -> set of attribute handles being updated
            const updatesMap = new Map<string, Set<string>>()
            input.attributeAssignments.forEach(assignment => {
                const productAttributeHandles = assignment.attributes.map(a => {
                    // Use the handle directly from the input since it should already be normalized
                    return (a as any).handle || a.name
                })
                logger.info(`Product ${assignment.productId} will update: [${productAttributeHandles.join(', ')}]`)
                updatesMap.set(assignment.productId, new Set(productAttributeHandles))
            })

            // 3. Identify conflicts and build compensation data (inline)
            const compensationData: UpdateCompensationData[] = []
            const linksToRemove: any[] = []

            products.forEach((product: any) => {
                const attributesToUpdate = updatesMap.get(product.id) || new Set()
                const conflictingAttributes: any[] = []

                logger.info(`Product ${product.id}: updating attributes [${Array.from(attributesToUpdate).join(', ')}]`);

                (product.attribute_values || []).forEach((av: any) => {
                    logger.debug(`Checking existing attribute: ${av.attribute.handle}`)
                    if (attributesToUpdate.has(av.attribute.handle)) {
                        // This attribute is being updated - mark for removal
                        logger.info(`CONFLICT: Removing existing ${av.attribute.handle}="${av.value}" (id: ${av.id})`)
                        conflictingAttributes.push({
                            name: av.attribute.handle,
                            value: av.value,
                            attribute_id: av.attribute.id,
                            attribute_value_id: av.id
                        })

                        linksToRemove.push({
                            [Modules.PRODUCT]: { product_id: product.id },
                            [ATTRIBUTE_MODULE]: { attribute_value_id: av.id }
                        })
                    }
                })

                if (conflictingAttributes.length > 0) {
                    compensationData.push({
                        productId: product.id,
                        previousAttributes: conflictingAttributes
                    })
                }
            })

            // 4. MERCURJS: Remove conflicting attributes
            if (linksToRemove.length > 0) {
                logger.info(`Removing ${linksToRemove.length} conflicting attribute links`)
                await Promise.all(linksToRemove.map(link => linkService.dismiss(link)))
                logger.info(`Successfully removed conflicting attribute links`)
            }

            // 5. MERCURJS: Create new attribute values and links (inline)
            const assignments: Array<{ productId: string, handle: string, value: string, attribute_id?: string }> = []
            input.attributeAssignments.forEach(assignment => {
                assignment.attributes.forEach(attr => {
                    const handle = (attr as any).handle || attr.name
                    const attribute_id = (attr as any).attribute_id || attributeIdMap.get(handle)
                    assignments.push({
                        productId: assignment.productId,
                        handle: handle,
                        value: attr.value,
                        attribute_id: attribute_id
                    })
                })
            })

            const valuesToCreate = assignments
                .map(a => ({
                    attribute_id: a.attribute_id || attributeIdMap.get(a.handle),
                    value: a.value,
                    productId: a.productId
                }))
                .filter(v => v.attribute_id)

            if (valuesToCreate.length > 0) {
                const createdValues = await attributeModuleService.createAttributeValues(
                    valuesToCreate.map(v => ({ attribute_id: v.attribute_id!, value: v.value, rank: 0 }))
                )
                const normalizedValues = Array.isArray(createdValues) ? createdValues : [createdValues]

                const links = normalizedValues.map((value, index) => ({
                    [Modules.PRODUCT]: { product_id: valuesToCreate[index].productId },
                    [ATTRIBUTE_MODULE]: { attribute_value_id: value.id }
                }))

                await linkService.create(links)
            }

            logger.info(`✅ Updated attributes for ${productIds.length} products`)

            return new StepResponse({ updated: productIds.length }, compensationData)

        } catch (error) {
            logger.error(`Attribute update failed:`, error)
            throw error
        }
    },

    // Simple compensation - restore only changed attributes
    async (compensationData: UpdateCompensationData[] | undefined, { container }) => {
        if (!compensationData?.length) return

        const attributeModuleService = container.resolve(ATTRIBUTE_MODULE)
        const linkService = container.resolve(ContainerRegistrationKeys.LINK)
        const queryService = container.resolve(ContainerRegistrationKeys.QUERY)
        const logger = container.resolve("logger")

        try {
            // For each product, remove new attributes and restore previous ones
            for (const productData of compensationData) {
                if (productData.previousAttributes.length === 0) continue

                const changedHandles = new Set(productData.previousAttributes.map(attr => attr.name))

                // Query and remove current attributes for the changed handles
                const { data: currentLinks } = await queryService.graph({
                    entity: "product_attribute_value",
                    fields: ["product_id", "attribute_value_id", "attribute_value.attribute.handle"],
                    filters: { product_id: productData.productId }
                })

                const linksToRemove = currentLinks.filter((link: any) =>
                    changedHandles.has(link.attribute_value?.attribute?.handle)
                )

                if (linksToRemove.length > 0) {
                    await Promise.all(linksToRemove.map((link: any) =>
                        linkService.dismiss({
                            [Modules.PRODUCT]: { product_id: link.product_id },
                            [ATTRIBUTE_MODULE]: { attribute_value_id: link.attribute_value_id }
                        })
                    ))
                }

                // Restore previous attribute values
                const restoredValues = await attributeModuleService.createAttributeValues(
                    productData.previousAttributes.map(attr => ({
                        attribute_id: attr.attribute_id,
                        value: attr.value,
                        rank: 0
                    }))
                )
                const normalizedRestored = Array.isArray(restoredValues) ? restoredValues : [restoredValues]

                await linkService.create(
                    normalizedRestored.map(value => ({
                        [Modules.PRODUCT]: { product_id: productData.productId },
                        [ATTRIBUTE_MODULE]: { attribute_value_id: value.id }
                    }))
                )
            }

            logger.info(`🔄 Restored previous attributes for ${compensationData.length} products`)
        } catch (error) {
            logger.error(`Rollback failed (non-fatal):`, error)
        }
    }
)

// No helper functions needed - everything is inline in the step above!
