import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { LinkDefinition } from "@medusajs/framework/types"
import { MercurModules } from "@mercurjs/types"
import { batchAssignDefaultShippingProfile } from "../../hooks/handle/assign-default-shipping-profile"
const SELLER_MODULE = MercurModules.SELLER

export const createSellerAssociationsStepId = "create-seller-associations"

/**
 * Input interface for creating seller associations
 */
export interface CreateSellerAssociationsStepInput {
  products: Array<{ id: string; handle: string }>
  sellerId: string
  transactionId?: string
}

/**
 * Result interface for seller associations step
 */
export interface CreateSellerAssociationsStepResult {
  sellerProductLinks: number
  shippingProfileAssignments: number
  processedProductIds: string[]
}

/**
 * Create seller associations step
 * Handles seller-product links and shipping profile assignments for CSV imports
 *
 * Compensation: Removes all seller associations made by this step
 */
export const createSellerAssociationsStep = createStep(
  createSellerAssociationsStepId,
  async (
    input: CreateSellerAssociationsStepInput,
    { container }
  ): Promise<StepResponse<CreateSellerAssociationsStepResult, LinkDefinition[]>> => {
    const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
    const logger = container.resolve("logger")

    const processedProductIds: string[] = []
    let sellerProductLinks = 0
    let shippingProfileAssignments = 0

    try {
      logger.info(`Creating seller associations for ${input.products.length} products`)

      // 1. Create seller-product links
      const sellerProductRemoteLinks: LinkDefinition[] = input.products.map((product) => ({
        [Modules.PRODUCT]: {
          product_id: product.id
        },
        [SELLER_MODULE]: {
          seller_id: input.sellerId
        }
      }))

      if (sellerProductRemoteLinks.length > 0) {
        await remoteLink.create(sellerProductRemoteLinks)
        sellerProductLinks = sellerProductRemoteLinks.length
        processedProductIds.push(...input.products.map(p => p.id))
        logger.info(`Created ${sellerProductLinks} seller-product links`)
      }

      // 2. Assign default shipping profiles to products
      // 2. Assign default shipping profiles to products
      try {
        const productIds = input.products.map(p => p.id)
        if (productIds.length > 0) {
          await batchAssignDefaultShippingProfile(container, productIds)
          shippingProfileAssignments = productIds.length // Optimistic count
        }
      } catch (error) {
        logger.error(`Failed to batch assign shipping profiles:`, error)
        // Don't fail the entire step for shipping profile errors
      }

      logger.info(`Assigned shipping profiles to ${shippingProfileAssignments} products`)

      // TODO: Add seller-shipping option association logic
      // This needs investigation of current seller_seller_fulfillment_shipping_option implementation

      const result: CreateSellerAssociationsStepResult = {
        sellerProductLinks,
        shippingProfileAssignments,
        processedProductIds
      }

      logger.info(`Seller associations completed: ${sellerProductLinks} links, ${shippingProfileAssignments} shipping profiles`)

      return new StepResponse(result, sellerProductRemoteLinks)
    } catch (error) {
      logger.error(`Seller association creation step failed:`, error)
      throw error
    }
  },

  // 2. Compensation Function
  async (linksToDismiss: LinkDefinition[] | undefined, { container }) => {
    if (!linksToDismiss?.length) {
      return
    }

    const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
    const logger = container.resolve("logger")

    logger.info(`Rolling back ${linksToDismiss.length} seller associations`)

    try {
      // Correct Batch Dismissal
      await remoteLink.dismiss(linksToDismiss)
      logger.info(`Rolled back seller associations`)
    } catch (error) {
      logger.error(`Failed to batch rollback seller associations:`, error)
    }

    // Note: Shipping profile assignments are not rolled back as they are product defaults
    // and may be needed regardless of seller association
  }
)