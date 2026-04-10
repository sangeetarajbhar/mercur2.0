import {createWorkflow, WorkflowResponse} from "@medusajs/framework/workflows-sdk";
import { createVideoEncodingJobsStep } from '../steps'
import { CreateVideoEncodingJobsDTO } from '../../../modules/video-encoding-jobs/types/mutations'
import { emitEventStep } from '@medusajs/medusa/core-flows'

export const createVideoEncodingJobsWorkflow = createWorkflow(
  'create-video-encoding-job-workflow',
  function (input: CreateVideoEncodingJobsDTO) {
    const videoEncodingJobs = createVideoEncodingJobsStep(input)

    if (videoEncodingJobs && videoEncodingJobs.encoding_job_id) {
      emitEventStep({
        eventName: 'video_encoding_jobs_created',
        data: {
          id: videoEncodingJobs.encoding_job_id
        }
      })
    }

    return new WorkflowResponse(videoEncodingJobs)
  }
)

