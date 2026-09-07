import { Module } from "@medusajs/framework/utils"
import VideoEncodingJobsModuleService from './service'

export const VIDEO_ENCODING_JOBS_MODULE = "video_encoding_jobs"

export default Module(VIDEO_ENCODING_JOBS_MODULE, {
  service: VideoEncodingJobsModuleService,
})

