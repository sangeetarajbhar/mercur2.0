export type CreateVideoEncodingJobsDTO = {
  reference_type: 'CMS' | 'CATALOG',
  file_name: string,
  s3_path: string,
  streaming_url: string | null,
  thumbnail_video_url: string | null,
  status: 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  encoding_job_id: string | null,
  metadata?: Record<string, any>,
  created_by: string,
  updated_by: string,
}

export enum ReferenceType {
  CMS = 'CMS',
  CATALOG = 'CATALOG',
}

export const referenceTypeMap = {
  [ReferenceType.CMS]: 'CMS',
  [ReferenceType.CATALOG]: 'CATALOG',
}

export type UpdateVideoEncodingJobsStatusDTO = {
  streaming_url: string | null,
  thumbnail_video_url: string | null,
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED',
  encoding_job_id: string,
  metadata?: Record<string, any> | null,
  updated_by: string,
}

export enum VideoEncodingJobsStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

