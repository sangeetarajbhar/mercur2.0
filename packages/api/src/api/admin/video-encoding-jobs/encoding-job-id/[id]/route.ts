import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { VideoEncodingJobsUpdateStatusType } from '../../validator'
import {
  updateVideoEncodingJobsStatusWorkflow
} from '../../../../../workflows/video-encoding-jobs/workflows/update-video-encoding-jobs-status-workflow'

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const userId = req.auth_context?.actor_id
  if (!userId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      'Unauthorized user'
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const encodingJobId = req.params.id

  const { data: videoEncodingJobs } = await query.graph({
    entity: 'video_encoding_jobs',
    fields: [...req.queryConfig.fields],
    filters: { encoding_job_id: encodingJobId },
  })

  const S3_BASE_URL = process.env.S3_FILE_URL
  const transformedJobs = videoEncodingJobs.map((job) => ({
    ...job,
    s3_path: job.s3_path
      ? `${S3_BASE_URL}/${job.s3_path.replace(/^\/+/, '')}`
      : null,
  }))

  res.json({ video_encoding_jobs: transformedJobs })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VideoEncodingJobsUpdateStatusType>,
  res: MedusaResponse
) => {
  const userId = req.auth_context?.actor_id
  if (!userId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      'Unauthorized user'
    )
  }

  const encodingJobId = req.params.id
  const { status, streaming_url, thumbnail_video_url, metadata } = req.validatedBody
  const { result } = await updateVideoEncodingJobsStatusWorkflow(req.scope).run({
    input: {
      streaming_url: streaming_url ?? null,
      thumbnail_video_url: thumbnail_video_url ?? null,
      status: status as 'PROCESSING' | 'COMPLETED' | 'FAILED',
      encoding_job_id: encodingJobId,
      metadata: metadata ?? null,
      updated_by: userId,
    } as const,
  })

  if (!result) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Video encoding job could not be retrieved'
    )
  }

  res.status(200).json({ video_encoding_job: result })
}

