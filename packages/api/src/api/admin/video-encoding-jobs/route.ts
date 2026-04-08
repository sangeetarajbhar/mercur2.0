import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { VideoEncodingJobsCreateType } from './validator'
import { createVideoEncodingJobsWorkflow } from '../../../workflows/video-encoding-jobs/workflows'
import { MedusaError } from '@medusajs/framework/utils'
import { parseDateFilter } from '../../../utils/helpers/common-filter-helpers'

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
  const filterableFields = req.filterableFields || {}
  const { q, ...restFilters } = filterableFields as Record<string, unknown> & { q?: string }
  const filters: Record<string, unknown> = { ...restFilters }
  const extractedOrderParam = { current: undefined as string | undefined }
  const normalizedCreatedAt = parseDateFilter(filters?.created_at, extractedOrderParam)
  if (normalizedCreatedAt !== undefined) filters.created_at = normalizedCreatedAt
  const normalizedUpdatedAt = parseDateFilter(filters?.updated_at, extractedOrderParam)
  if (normalizedUpdatedAt !== undefined) filters.updated_at = normalizedUpdatedAt

  if (q && q.trim().length > 0) {
    const search = `%${q.trim()}%`
    const encodingJobId = q.trim()
    filters.$or = [
      { id: { $ilike: search } },
      { file_name: { $ilike: search } },
      { encoding_job_id: { $eq: encodingJobId } },
    ]
  }

  const { data: videoEncodingJobs, metadata } = await query.graph({
    entity: 'video_encoding_jobs',
    fields: [...req.queryConfig.fields],
    filters,
    pagination: req.queryConfig.pagination
  })

  const S3_BASE_URL = process.env.S3_FILE_URL
  const transformedJobs = videoEncodingJobs.map((job) => ({
    ...job,
    s3_path: job.s3_path
      ? `${S3_BASE_URL}/${job.s3_path.replace(/^\/+/, '')}`
      : null,
  }))

  res.json({
    video_encoding_jobs: transformedJobs,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<VideoEncodingJobsCreateType>,
  res: MedusaResponse
) => {
  try {
    const { reference_type, s3_path, file_name, encoding_job_id } = req.validatedBody
    const userId = req.auth_context?.actor_id
    if (!userId) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, 'Unauthorized user')
    }
    if (!s3_path || !file_name || !encoding_job_id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, 'S3 path, file name, and encoding job ID are required')
    }

    const { result } = await createVideoEncodingJobsWorkflow(req.scope).run({
      input: {
        reference_type: reference_type as 'CMS' | 'CATALOG',
        file_name: file_name,
        s3_path: s3_path,
        streaming_url: null,
        thumbnail_video_url: null,
        status: 'UPLOADED' as const,
        encoding_job_id: encoding_job_id,
        created_by: userId,
        updated_by: userId,
      },
    })

    if (!result) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Video encoding job was created but could not be retrieved')
    }
    res.status(200).json({ video_encoding_job: result })
  } catch (error) {
    if (error instanceof MedusaError) {
      res.status(error.type === MedusaError.Types.UNAUTHORIZED ? 401 : 400).json({
        message: error.message,
        type: error.type,
      })
      return
    }
    res.status(500).json({
      message: (error as Error).message || 'An unexpected error occurred',
      type: 'UNEXPECTED_ERROR',
    })
  }
}

