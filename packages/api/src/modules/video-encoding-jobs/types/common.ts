import { z } from "zod"

// export const VideoMaxFileSize = 20971520 // 20MB in bytes
export const VideoMaxFileSize = 21072714 // 20MiB in bytes
export const VideoMaxFileSizeInMb = 20 // 20MB in bytes

// Define a schema for file objects
export const VideoFileSchema = z.object({
  file: z.object({
    name: z.string(),
    size: z.number().optional().refine(
      (size) => !size || size <= VideoMaxFileSize,
      { message: `File size must not exceed ${VideoMaxFileSizeInMb} MB` }
    ),
    type: z.string().optional(),
  }),
  url: z.string().optional(),
  isThumbnail: z.boolean().optional(),
  base64Content: z.string().optional(), // Add base64 content field for S3 upload
}).or(z.string()); // Allow either file objects or strings for backward compatibility

