import { z } from "zod";
import { VideoFileSchema } from "../types";

export const VideoEncodingJobsSchema = z.object({
  reference_type: z.enum(["CMS", "CATALOG"], {
    required_error: "Reference type is required",
    invalid_type_error: "Reference type must be either 'CMS' or 'CATALOG'",
  }),
  file_name: z.array(VideoFileSchema).min(1, "Video file is required....."),
});

export const CreateVideoEncodingJobsSchema = VideoEncodingJobsSchema;
export type CreateVideoEncodingJobsSchemaType = z.infer<
  typeof VideoEncodingJobsSchema
>;
