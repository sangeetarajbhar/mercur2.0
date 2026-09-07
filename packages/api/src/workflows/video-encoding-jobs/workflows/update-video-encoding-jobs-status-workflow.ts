import {createWorkflow, WorkflowResponse} from "@medusajs/framework/workflows-sdk";
import { UpdateVideoEncodingJobsStatusDTO } from '../../../modules/video-encoding-jobs/types/mutations'
import { updateVideoEncodingJobsStatusStep } from '../steps/update-video-encoding-jobs-status'

export const updateVideoEncodingJobsStatusWorkflow = createWorkflow(
  'update-video-encoding-job-status-workflow',
  function (input: UpdateVideoEncodingJobsStatusDTO) {
    const videoEncodingJobs = updateVideoEncodingJobsStatusStep(input)

    return new WorkflowResponse(videoEncodingJobs)
  }
)

