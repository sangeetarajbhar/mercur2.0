import {
  createWorkflow,
  WorkflowData,
  WorkflowResponse,
  parallelize,
  when,
  transform
} from "@medusajs/framework/workflows-sdk"
import {
  createProductsWorkflow,
  updateProductsWorkflow,
  deleteProductsWorkflow
} from "@medusajs/medusa/core-flows"
import type {
  ProductTypes,
  BatchWorkflowInput,
  BatchWorkflowOutput,
  CreateProductWorkflowInputDTO,
  UpdateProductWorkflowInputDTO
} from "@medusajs/framework/types"
import { validateImageUrlsStep } from "../../steps/validate-image-urls"
import { validateBatchVariantsStep } from "../../steps/enhanced-import/validate-batch-variants"

export const enhancedBatchProductsWorkflowId = "enhanced-batch-products"

// Extended DTOs to include per-product additional_data
export interface EnhancedCreateProductInput extends CreateProductWorkflowInputDTO {
  additional_data?: {
    configuration?: Record<string, any>
    attributes?: Record<string, any>
    sizeChart?: Record<string, any>
    images?: string[]
    [key: string]: any
  }
}

export interface EnhancedUpdateProductInput extends UpdateProductWorkflowInputDTO {
  additional_data?: {
    configuration?: Record<string, any>
    attributes?: Record<string, any>
    sizeChart?: Record<string, any>
    images?: string[]
    [key: string]: any
  }
}

/**
 * Enhanced batch workflow input that includes additional_data for enhancements
 */
export interface EnhancedBatchProductWorkflowInput extends BatchWorkflowInput<
  EnhancedCreateProductInput,
  EnhancedUpdateProductInput
> {
  additional_data?: {
    attributes: Record<string, Array<{ handle: string; value: string }>>
    configurations: Record<string, any>
    sizeCharts: Record<string, any>
    transactionId: string
    sellerId: string
    [key: string]: unknown
  }
}

// Conditional step functions that mirror the original workflow structure
const conditionallyCreateProducts = (input: EnhancedBatchProductWorkflowInput) =>
  when({ input }, ({ input }) => !!input.create?.length).then(() =>
    createProductsWorkflow.runAsStep({
      input: {
        products: input.create!,
        additional_data: input.additional_data // KEY CHANGE: Pass additional_data
      }
    })
  )

const conditionallyUpdateProducts = (input: EnhancedBatchProductWorkflowInput) =>
  when({ input }, ({ input }) => !!input.update?.length).then(() =>
    updateProductsWorkflow.runAsStep({
      input: {
        products: input.update!,
        additional_data: input.additional_data // KEY CHANGE: Pass additional_data
      }
    })
  )

const conditionallyDeleteProducts = (input: EnhancedBatchProductWorkflowInput) =>
  when({ input }, ({ input }) => !!input.delete?.length).then(() =>
    deleteProductsWorkflow.runAsStep({
      input: {
        ids: input.delete!
      }
    })
  )

/**
 * Enhanced batch products workflow that mirrors the core batchProductsWorkflow
 * but properly propagates additional_data for enhancement processing via hooks
 *
 * This workflow:
 * - Maintains the same parallel execution pattern as the original
 * - Passes additional_data to create/update workflows for hook processing
 * - Supports all original functionality (create/update/delete)
 * - Enables automatic enhancement processing via our hook system
 */
export const enhancedBatchProductsWorkflow = createWorkflow(
  enhancedBatchProductsWorkflowId,
  (
    input: WorkflowData<EnhancedBatchProductWorkflowInput>
  ): WorkflowResponse<BatchWorkflowOutput<ProductTypes.ProductDTO>> => {

    // Validate image URLs before processing (fail-fast)
    const urlValidation = validateImageUrlsStep({
      products: transform({ input }, ({ input }) =>
        [...(input.create || []), ...(input.update || [])].map(p => ({
          handle: p.handle!,
          images: (p.images || []).map(img => img.url).filter((url): url is string => !!url)
        }))
      )
    })

    // Validate variants before processing (fail-fast)
    validateBatchVariantsStep({ batchInput: input }).config({
      name: 'validate-batch-variants-step'
    })

    // Execute all operations in parallel
    const res = parallelize(
      conditionallyCreateProducts(input),
      conditionallyUpdateProducts(input),
      conditionallyDeleteProducts(input)
    )

    // Transform results into standard batch output format (same as original)
    return new WorkflowResponse(
      transform({ res, input }, (data) => {
        return {
          created: data.res[0] ?? [],
          updated: data.res[1] ?? [],
          deleted: data.input.delete ?? []
        }
      })
    )
  }
)