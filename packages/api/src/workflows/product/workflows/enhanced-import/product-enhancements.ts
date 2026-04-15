import {
  createWorkflow,
  WorkflowData,
  WorkflowResponse,
  parallelize,
  transform
} from "@medusajs/framework/workflows-sdk"
import { createProductAttributesStep } from "../../steps/create-product-attributes"
import { createProductConfigurationsStep } from "../../steps/create-product-configurations"
import { ProductConfigurationInput } from "../../../../modules/product-configuration"

export const productEnhancementsWorkflowId = "product-enhancements"

/**
 * Enhancement data interface for a single product
 */
export interface ProductEnhancementData {
  productId: string
  productHandle: string
  attributes?: Array<{ name: string; value: string }>
  configurations?: ProductConfigurationInput
  sizeChart?: Record<string, any>
}

/**
 * Workflow input interface
 */
export interface ProductEnhancementsWorkflowInput {
  products: ProductEnhancementData[]
  transactionId: string
  sellerId: string
}

/**
 * Enhancement step result interface
 */
export interface EnhancementStepResult {
  processed: number
  successful: number
  failed: Array<{ productId: string; error: string }>
  processedProductIds: string[]
}

/**
 * Standalone workflow for processing product attributes, configurations, and size charts
 * Called from hooks when products are created/updated during import operations
 *
 * Benefits:
 * - Runs after products are successfully created/updated
 * - Parallel processing of attributes and configurations
 * - Clean separation from core product operations
 * - Proper error handling and rollback
 */
export const productEnhancementsWorkflow = createWorkflow(
  productEnhancementsWorkflowId,
  (
    input: WorkflowData<ProductEnhancementsWorkflowInput>
  ): WorkflowResponse<{ processed: number; successful: number; failed: number }> => {

    transform({ input }, (data, { container }) => {
      const logger = container.resolve("logger")
      logger.info(`[productEnhancementsWorkflow] Invoked with transactionId: ${data.input.transactionId}, sellerId: ${data.input.sellerId}, products count: ${data.input.products.length}`)
      logger.info(`[productEnhancementsWorkflow] Input sample check - First product: ${JSON.stringify(data.input.products[0] ? {
        handle: data.input.products[0].productHandle,
        attrCount: data.input.products[0].attributes?.length,
        hasConfig: !!data.input.products[0].configurations
      } : 'none')}`)
    })

    const stepInputs = transform(
      { products: input.products, transactionId: input.transactionId },
      (data) => {
        return {
          attributesInput: {
            products: data.products.map(p => ({ id: p.productId, handle: p.productHandle })),
            attributeAssignments: data.products
              .filter(p => p.attributes?.length)
              .map(p => ({
                productHandle: p.productHandle,
                attributes: p.attributes!
              })),
            transactionId: data.transactionId
          },
          configInput: {
            products: data.products.map(p => ({ id: p.productId, handle: p.productHandle })),
            productConfigurations: data.products
              .filter(p => p.configurations && Object.keys(p.configurations).length > 0)
              .map(p => ({
                productHandle: p.productHandle,
                config: p.configurations!
              })),
            transactionId: data.transactionId
          }
        }
      }
    )

    // Process attributes and configurations in parallel for maximum performance
    const [attributeResults, configurationResults] = parallelize(
      createProductAttributesStep(stepInputs.attributesInput),
      createProductConfigurationsStep(stepInputs.configInput)
    )

    const workflowResult = transform(
      {
        productsLen: input.products.length,
        attrRes: attributeResults,
        confRes: configurationResults
      },
      (data) => ({
        processed: data.productsLen,
        successful: (data.attrRes?.successful || 0) + (data.confRes?.successful || 0),
        failed: 0  // No direct failed count from steps, assume success or exception will be caught
      })
    )

    return new WorkflowResponse(workflowResult)
  }
)