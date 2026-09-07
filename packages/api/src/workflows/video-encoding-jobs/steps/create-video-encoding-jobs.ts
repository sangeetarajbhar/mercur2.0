import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { MedusaError } from '@medusajs/framework/utils'
import { CreateVideoEncodingJobsDTO } from '../../../modules/video-encoding-jobs/types/mutations'
import VideoEncodingJobsModuleService from '../../../modules/video-encoding-jobs/service'
import { VIDEO_ENCODING_JOBS_MODULE } from '../../../modules/video-encoding-jobs'

export const createVideoEncodingJobsStep = createStep(
  'create-video-encoding-jobs-step',
  async (data: CreateVideoEncodingJobsDTO, { container }) => {
    const service = container.resolve<VideoEncodingJobsModuleService>(VIDEO_ENCODING_JOBS_MODULE)
    const videoEncodingJobs = await service.createVideoEncodingJobs(data)

    return new StepResponse(videoEncodingJobs, videoEncodingJobs.id)
  },
  async (videoEncodingJobsId: string, { container }) => {
    if (!videoEncodingJobsId) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Video Encoding Job ID is required for compensation')
    }

    const service = container.resolve<VideoEncodingJobsModuleService>(VIDEO_ENCODING_JOBS_MODULE)
    await service.softDeleteVideoEncodingJobs(videoEncodingJobsId)
  }
)

