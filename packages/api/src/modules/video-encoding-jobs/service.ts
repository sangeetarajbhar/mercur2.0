import { MedusaService } from "@medusajs/framework/utils"
import { VideoEncodingJobs } from "./models/video_encoding_jobs"

class VideoEncodingJobsModuleService extends MedusaService({
  VideoEncodingJobs,
}) {

}

export default VideoEncodingJobsModuleService

