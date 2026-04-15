import type { WorkflowTypes } from "@medusajs/framework/types"
import {
  WorkflowData,
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { waitConfirmationProductImportStep, notifyOnFailureStep, sendNotificationsStep } from "@medusajs/medusa/core-flows"
import { enhancedNormalizeCsvToChunksStep } from "../../steps/enhanced-import/enhanced-normalize-csv-to-chunks"
import { enhancedProcessImportChunksStep } from "../../steps/enhanced-import/enhanced-process-import-chunks"

export const enhancedImportProductsAsChunksWorkflowId = "enhanced-import-products-as-chunks"

/**
 * Enhanced product import workflow that mirrors the core Medusa import pattern
 * while adding seller authorization, dynamic attributes, and enhanced image processing.
 *
 * This workflow follows the exact same pattern as Medusa's importProductsAsChunksWorkflow:
 * 1. Parse and normalize CSV with enhanced features
 * 2. Wait for confirmation
 * 3. Process chunks using enhanced logic that wraps batchProductsWorkflow
 */
export const enhancedImportProductsAsChunksWorkflow = createWorkflow(
  enhancedImportProductsAsChunksWorkflowId,
  (
    input: WorkflowData<{ fileKey: string; filename: string; sellerId: string }>
  ): WorkflowResponse<WorkflowTypes.ProductWorkflow.ImportProductsSummary> => {
    // Step 1: Enhanced CSV parsing with seller auth, attributes, and configs
    const batchRequest = enhancedNormalizeCsvToChunksStep({
      fileKey: input.fileKey,
      sellerId: input.sellerId
    })

    // Step 2: Wait for confirmation (reuse existing Medusa step)
    waitConfirmationProductImportStep()

    // Step 3: Setup failure notifications (following Medusa's exact pattern)
    // This catches failures from chunk processing steps that come after
    const failureNotification = transform({ input }, (data) => {
      return [
        {
          to: "",
          channel: "feed",
          template: "admin-ui",
          data: {
            title: "Enhanced Product Import",
            description: `Failed to import products from file ${data.input.filename}`,
          },
        },
      ]
    })

    notifyOnFailureStep(failureNotification)

    // Step 4: Enhanced chunk processing (uses batchProductsWorkflow.runAsStep)
    const processResult = enhancedProcessImportChunksStep({
      chunks: batchRequest.chunks,
      sellerId: input.sellerId
    })


    // Step 5: Send notifications based on processing result
    const notifications = transform({ input, processResult }, (data) => {
      // If processing failed, send detailed error notification
      if (!data.processResult.success) {
        return [
          {
            to: "",
            channel: "feed",
            template: "admin-ui",
            data: {
              title: "Enhanced Product Import Failed",
              description: data.processResult.error || `Failed to import products from file ${data.input.filename}`,
            },
          },
        ]
      }

      // Success notification
      return [
        {
          to: "",
          channel: "feed",
          template: "admin-ui",
          data: {
            title: "Enhanced Product Import",
            description: `Enhanced product import of file ${data.input.filename} completed successfully!`,
          },
        },
      ]
    })

    sendNotificationsStep(notifications)
    return new WorkflowResponse(batchRequest.summary)
  }
)