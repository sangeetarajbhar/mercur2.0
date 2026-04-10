import {
  MiddlewareRoute, validateAndTransformBody,
  validateAndTransformQuery
} from '@medusajs/framework'

import {
  VideoEncodingJobsCreateSchema,
  VideoEncodingJobsParams,
  VideoEncodingJobsUpdateStatusSchema,
  VideoEncodingJobsPresignedUrlSchema
} from './validator'
import { videoEncodingJobsQueryConfig } from './query-config'

export const videoEncodingJobsMiddlewares: MiddlewareRoute[] = [
  {
    methods: ['GET'],
    matcher: '/admin/video-encoding-jobs',
    middlewares: [
      validateAndTransformQuery(VideoEncodingJobsParams, videoEncodingJobsQueryConfig.list)
    ]
  },
  {
    methods: ['POST'],
    matcher: '/admin/video-encoding-jobs',
    middlewares: [
      validateAndTransformBody(VideoEncodingJobsCreateSchema),
      validateAndTransformQuery(
        VideoEncodingJobsParams,
        videoEncodingJobsQueryConfig.list
      )
    ]
  },
  {
    methods: ['POST'],
    matcher: '/admin/video-encoding-jobs/presigned-url',
    middlewares: [
      validateAndTransformBody(VideoEncodingJobsPresignedUrlSchema),
    ]
  },
  {
    methods: ["GET"],
    matcher: "/admin/video-encoding-jobs/encoding-job-id/:id",
    middlewares: [
      validateAndTransformQuery(VideoEncodingJobsParams, videoEncodingJobsQueryConfig.retrieve),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/video-encoding-jobs/encoding-job-id/:id",
    middlewares: [
      validateAndTransformBody(VideoEncodingJobsUpdateStatusSchema),
      validateAndTransformQuery(
        VideoEncodingJobsParams,
        videoEncodingJobsQueryConfig.retrieve
      ),
    ],
  },
]

