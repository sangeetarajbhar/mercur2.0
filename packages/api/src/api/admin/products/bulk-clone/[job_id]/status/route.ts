import { MedusaError } from "@medusajs/framework/utils"
import { Request as MedusaRequest, Response as MedusaResponse } from "express"

/**
 * GET handler for checking bulk clone job status
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { job_id } = req.params
  
  if (!job_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Job ID is required"
    )
  }
  
  try {
    // Check if the job exists in our in-memory store
    if (!global.bulkCloneJobs || !global.bulkCloneJobs[job_id]) {
      return res.status(404).json({
        success: false,
        message: `Job with id ${job_id} not found`,
      })
    }
    
    const job = global.bulkCloneJobs[job_id]

    // console.log("Job:", job)
    
    // Calculate time elapsed since job creation
    const elapsedMs = new Date().getTime() - new Date(job.created_at).getTime()
    const elapsedSeconds = Math.floor(elapsedMs / 1000)
    
    // Format result data for better frontend display
    const formattedResult = job.result || {}
    if (formattedResult.successful) {
      formattedResult.successful_count = formattedResult.successful.length
    }
    if (formattedResult.failed) {
      formattedResult.failed_count = formattedResult.failed.length
    }
    
    return res.status(200).json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress || 0,
        result: formattedResult,
        created_at: job.created_at,
        updated_at: job.updated_at,
        elapsed_seconds: elapsedSeconds,
      },
    })
  } catch (error) {
    console.error(`Error retrieving job status for ${job_id}:`, error)
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to retrieve job status",
      error_details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}
