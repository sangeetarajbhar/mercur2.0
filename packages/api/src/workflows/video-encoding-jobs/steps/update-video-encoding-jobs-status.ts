import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { MedusaError } from '@medusajs/framework/utils'
import {
  UpdateVideoEncodingJobsStatusDTO, VideoEncodingJobsStatus
} from '../../../modules/video-encoding-jobs/types/mutations'
import VideoEncodingJobsModuleService from '../../../modules/video-encoding-jobs/service'
import { VIDEO_ENCODING_JOBS_MODULE } from '../../../modules/video-encoding-jobs'

export const updateVideoEncodingJobsStatusStep = createStep(
  'update-video-encoding-jobs-status-step',
  async (data: UpdateVideoEncodingJobsStatusDTO, { container }) => {
    const service = container.resolve<VideoEncodingJobsModuleService>(VIDEO_ENCODING_JOBS_MODULE)

    const existingJobs = await service.listVideoEncodingJobs({
      encoding_job_id: data.encoding_job_id,
    })

    if (!existingJobs || existingJobs.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Video encoding job with encoding_job_id ${data.encoding_job_id} not found`
      )
    }

    if (existingJobs.length > 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Multiple video encoding jobs found with encoding_job_id ${data.encoding_job_id}`
      )
    }

    const existingJob = existingJobs[0]
    const currentStatus = existingJob.status as 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    const newStatus = data.status

    const isValidTransition = (() => {
      if (currentStatus === newStatus) {
        return true
      }
      if (newStatus === VideoEncodingJobsStatus.FAILED) {
        return currentStatus !== VideoEncodingJobsStatus.COMPLETED && currentStatus !== VideoEncodingJobsStatus.FAILED
      }
      if (currentStatus === VideoEncodingJobsStatus.COMPLETED) {
        return false
      }
      if (currentStatus === VideoEncodingJobsStatus.FAILED) {
        return false
      }
      const validTransitions: Record<'UPLOADED' | 'PROCESSING', string[]> = {
        UPLOADED: [VideoEncodingJobsStatus.PROCESSING, VideoEncodingJobsStatus.FAILED],
        PROCESSING: [VideoEncodingJobsStatus.COMPLETED, VideoEncodingJobsStatus.FAILED],
      }
      return validTransitions[currentStatus as 'UPLOADED' | 'PROCESSING']?.includes(newStatus) ?? false
    })()

    if (!isValidTransition) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. ` +
        `Valid flow: UPLOADED -> PROCESSING -> COMPLETED. ` +
        `FAILED status can occur from UPLOADED or PROCESSING state only.`
      )
    }

    const videoEncodingJobs = await service.updateVideoEncodingJobs({
      id: existingJob.id,
      status: data.status,
      streaming_url: data.streaming_url,
      thumbnail_video_url: data.thumbnail_video_url,
      metadata: data.metadata,
      updated_by: data.updated_by,
    })

    return new StepResponse(videoEncodingJobs, existingJob)
  },
  async (prevJob, { container }) => {
    if (!prevJob) {
      return
    }

    const service = container.resolve<VideoEncodingJobsModuleService>(
      VIDEO_ENCODING_JOBS_MODULE
    )

    await service.updateVideoEncodingJobs({
      id: prevJob.id,
      status: prevJob.status,
      streaming_url: prevJob.streaming_url,
      thumbnail_video_url: prevJob.thumbnail_video_url,
      metadata: prevJob.metadata,
      updated_by: prevJob.updated_by,
    })
  }

)

