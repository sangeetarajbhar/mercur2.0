export const defaultVideoEncodingJobsFields = [
  'id',
  'reference_type',
  'file_name',
  's3_path',
  'streaming_url',
  'thumbnail_video_url',
  'status',
  'encoding_job_id',
  'metadata',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
  'user.id',
  'user.first_name',
  'user.last_name',
]

export const videoEncodingJobsQueryConfig = {
  list: {
    defaults: defaultVideoEncodingJobsFields,
    isList: true
  },
  retrieve: {
    defaults: defaultVideoEncodingJobsFields,
    isList: false
  }
}

