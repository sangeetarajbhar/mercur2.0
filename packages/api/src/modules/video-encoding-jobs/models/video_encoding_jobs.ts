import { model } from "@medusajs/framework/utils"

export const VideoEncodingJobs = model.define("video_encoding_jobs", {
  id: model.id().primaryKey(),
  reference_type: model.enum(['CMS', 'CATALOG']).default('CMS'),
  file_name: model.text(),
  s3_path: model.text(),
  streaming_url: model.text().nullable(),
  thumbnail_video_url: model.text().nullable(),
  status: model.enum(['UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED']),
  encoding_job_id: model.text().nullable(),
  metadata: model.json().nullable(),
  created_by: model.text(),
  updated_by: model.text(),
}).indexes([
  {
    on: ['encoding_job_id'],
  },
])

