import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError, Modules } from '@medusajs/framework/utils'
import { IWorkflowEngineService } from "@medusajs/framework/types"

/**
 * @oas [get] /admin/products/enhanced-import/{transactionId}/status
 * summary: "Get Enhanced Import Status"
 * operationId: "GetAdminProductsEnhancedImportStatus"
 * description: "Check the status of a background enhanced product import job."
 * parameters:
 *   - name: transactionId
 *     in: path
 *     required: true
 *     description: "Transaction ID returned from the enhanced import endpoint"
 *     schema:
 *       type: string
 * responses:
 *   200:
 *     description: "Import status retrieved successfully"
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             transactionId:
 *               type: string
 *             status:
 *               type: string
 *               enum: [pending, running, completed, failed, cancelled]
 *             progress:
 *               type: object
 *               properties:
 *                 processedProducts:
 *                   type: number
 *                 totalProducts:
 *                   type: number
 *                 currentStep:
 *                   type: string
 *                 completedSteps:
 *                   type: array
 *                   items:
 *                     type: string
 *             result:
 *               type: object
 *               nullable: true
 *               description: "Final result if completed"
 *               properties:
 *                 processedProducts:
 *                   type: number
 *                 createdProducts:
 *                   type: number
 *                 updatedProducts:
 *                   type: number
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *             errors:
 *               type: array
 *               items:
 *                 type: string
 *               description: "Any errors encountered during processing"
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 *             completedAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *   404:
 *     description: "Transaction not found"
 *   401:
 *     description: "Unauthorized access"
 * x-authenticated: true
 * tags:
 *   - Products
 */
export const GET = async (
  req: AuthenticatedMedusaRequest<{ transactionId: string }>,
  res: MedusaResponse
) => {
  try {
    const { transactionId } = req.params

    if (!transactionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Transaction ID is required'
      )
    }

    // Get workflow engine from scope
    const workflowEngine = req.scope.resolve<IWorkflowEngineService>(Modules.WORKFLOW_ENGINE)

    try {
      // Get workflow execution status
      const execution = await (workflowEngine as any).getExecution(transactionId)

      if (!execution) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Import job with transaction ID ${transactionId} not found`
        )
      }

      // Map workflow state to API response
      const status = mapWorkflowStateToStatus(execution.state)
      const progress = calculateProgress(execution)

      return res.status(200).json({
        transactionId,
        status,
        progress,
        result: execution.result || null,
        errors: execution.errors?.map(err => err.message) || [],
        createdAt: execution.createdAt,
        updatedAt: execution.updatedAt,
        completedAt: execution.completedAt || null
      })

    } catch (workflowError) {
      console.error('Error fetching workflow status:', workflowError)

      // If we can't find the execution, it might be a new/invalid transaction ID
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Import job with transaction ID ${transactionId} not found or has expired`
      )
    }

  } catch (error) {
    console.error('Enhanced import status error:', error)

    // Handle known Medusa errors
    if (error instanceof MedusaError) {
      throw error
    }

    // Handle other errors
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to get import status: ${error.message}`
    )
  }
}

/**
 * Maps workflow execution state to user-friendly status
 */
function mapWorkflowStateToStatus(state: string): string {
  switch (state) {
    case 'not_started':
    case 'queued':
      return 'pending'
    case 'running':
    case 'invoking':
      return 'running'
    case 'done':
    case 'completed':
      return 'completed'
    case 'failed':
    case 'timeout':
      return 'failed'
    case 'cancelled':
    case 'reverted':
      return 'cancelled'
    default:
      return 'pending'
  }
}

/**
 * Calculates progress information from workflow execution
 */
function calculateProgress(execution: any): object {
  const steps = execution.steps || []
  const completedSteps = steps
    .filter(step => step.status === 'done' || step.status === 'completed')
    .map(step => step.id)

  const currentStep = steps
    .find(step => step.status === 'running' || step.status === 'invoking')?.id || null

  // Extract product processing progress if available
  const productProgress = execution.context?.productProgress || {}

  return {
    processedProducts: productProgress.processed || 0,
    totalProducts: productProgress.total || 0,
    currentStep,
    completedSteps,
    percentage: steps.length > 0 ? Math.round((completedSteps.length / steps.length) * 100) : 0
  }
}