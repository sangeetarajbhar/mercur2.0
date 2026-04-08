import { MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { VideoEncodingJobsUpdateStatusType } from '../../../../admin/video-encoding-jobs/validator'
import {
  updateVideoEncodingJobsStatusWorkflow
} from '../../../../../workflows/video-encoding-jobs/workflows/update-video-encoding-jobs-status-workflow'
import type { MedusaRequest } from "@medusajs/framework/http";

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve('logger')
  const apiKey = req.headers['x-zilo-lambda-key'] as string
  const expectedKey = process.env.VIDEO_ENCODING_API_KEY

  logger.info(`[videoEncoding] Authenticating request: ${apiKey ? 'Key provided' : 'No key'}`)

  if (!apiKey || apiKey !== expectedKey) {
    logger.warn('[videoEncoding] Unauthorized callback attempt')
    res.status(401).json({ message: 'Unauthorized' })
    return
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
  req: MedusaRequest<VideoEncodingJobsUpdateStatusType>,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve('logger')
  const apiKey = req.headers['x-zilo-lambda-key'] as string
  const expectedKey = process.env.VIDEO_ENCODING_API_KEY
  const encodingJobId = req.params.id

  logger.warn(`[videoEncoding] Authenticating request: ${apiKey ? 'Key provided' : 'No key'}`)

  if (!apiKey || apiKey !== expectedKey) {
    logger.error(`[videoEncoding] Unauthorized callback attempt for jobId: ${encodingJobId}`)
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  let userId = 'user_01K01JWMJYX6EQMHS47HP7G187';
  if (process.env.NODE_ENV === 'production') {
    userId = 'user_01KAB6PNKF7HPNV58PCND0A40X'
  }

  const { status, streaming_url, thumbnail_video_url, metadata } = req.validatedBody

  const updateVideoEncodingJobsStatusData = {
    streaming_url: streaming_url ?? null,
    thumbnail_video_url: thumbnail_video_url ?? null,
    status: status as 'PROCESSING' | 'COMPLETED' | 'FAILED',
    encoding_job_id: encodingJobId,
    metadata: metadata ?? null,
    updated_by: userId,
  } as const

  const { result } = await updateVideoEncodingJobsStatusWorkflow(req.scope).run({
    input: updateVideoEncodingJobsStatusData,
  })

  if (!result) {
    logger.error(`[videoEncoding] Video encoding job could not be retrieved jobId: ${encodingJobId}`)
    logger.error(`[videoEncoding] data: ${JSON.stringify(updateVideoEncodingJobsStatusData)}`)
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      'Video encoding job could not be retrieved'
    )
  }

  res.status(200).json({ video_encoding_job: updateVideoEncodingJobsStatusData })
}

