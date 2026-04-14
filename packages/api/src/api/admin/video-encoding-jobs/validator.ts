import { z } from "zod"
import { createFindParams, createOperatorMap } from '@medusajs/medusa/api/utils/validators'

export const VideoEncodingJobsParams = createFindParams({
  offset: 0,
  limit: 50
}).merge(
  z.object({
    q: z.string().optional(),
    order: z.string().optional(),
    created_at: createOperatorMap().optional(),
    updated_at: createOperatorMap().optional(),
    status: z.string().optional(),
  })
)

export const VideoEncodingJobsPresignedUrlSchema = z.object({
  reference_type: z.enum(['CMS', 'CATALOG'], {
    required_error: "Reference type is required",
    invalid_type_error: "Reference type must be either 'CMS' or 'CATALOG'"
  }),
  file_name: z.string().min(1, "File name is required"),
  file_type: z.string().min(1, "File type is required"),
})

export const VideoEncodingJobsCreateSchema = z.object({
  reference_type: z.enum(['CMS', 'CATALOG'], {
    required_error: "Reference type is required",
    invalid_type_error: "Reference type must be either 'CMS' or 'CATALOG'"
  }),
  s3_path: z.string().min(1, "S3 path is required"),
  file_name: z.string().min(1, "File name is required"),
  encoding_job_id: z.string().min(1, "Encoding job ID is required"),
})

export type VideoEncodingJobsCreateType = z.infer<
  typeof VideoEncodingJobsCreateSchema
>

export const VideoEncodingJobsUpdateStatusSchema = z
  .object({
    status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED'], {
      required_error: 'Status is required',
      invalid_type_error:
        "Status must be either 'PROCESSING', 'COMPLETED', or 'FAILED'",
    }),
    streaming_url: z.string().optional(),
    thumbnail_video_url: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'COMPLETED') {
      if (!data.streaming_url) {
        ctx.addIssue({
          path: ['streaming_url'],
          message: 'streaming_url is required when status is COMPLETED',
          code: z.ZodIssueCode.custom,
        })
      }

      if (!data.thumbnail_video_url) {
        ctx.addIssue({
          path: ['thumbnail_video_url'],
          message: 'thumbnail_video_url is required when status is COMPLETED',
          code: z.ZodIssueCode.custom,
        })
      }
    }
  })

export type VideoEncodingJobsUpdateStatusType = z.infer<
  typeof VideoEncodingJobsUpdateStatusSchema
>

