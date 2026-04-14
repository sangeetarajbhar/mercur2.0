import { defineLink } from "@medusajs/framework/utils"
import VideoEncodingJobs from '../modules/video-encoding-jobs'
import UserModule from "@medusajs/medusa/user"

export default defineLink(
  {
    linkable: VideoEncodingJobs.linkable.videoEncodingJobs,
      field: "created_by",
  },
  UserModule.linkable.user,
  {
    readOnly: true,
  },
)

