import { HttpTypes } from "@medusajs/types";
import { z } from "zod";

export interface VideoEncodingJobs {
  id: string;
  reference_type: string;
  file_name: Record<string, any>;
  s3_path: string;
  streaming_url: string | null;
  thumbnail_video_url: string | null;
  status: string;
  encoding_job_id: string | null;
  metadata?: Record<string, any>;
  created_by: string;
  updated_by: string;
  user: HttpTypes.AdminUser;
  created_at: Date;
  updated_at: Date;
}

export enum VideoEncodingJobsStatus {
  UPLOADED = "UPLOADED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum ReferenceType {
  CMS = "CMS",
  CATALOG = "CATALOG",
}

export const referenceTypeMap = {
  [ReferenceType.CMS]: "CMS",
  [ReferenceType.CATALOG]: "CATALOG",
};

export const VideoMaxFileSize = 21072714; // ~20MiB
export const VideoMaxFileSizeInMb = 20;

export const VideoFileSchema = z
  .object({
    file: z.object({
      name: z.string(),
      size: z
        .number()
        .optional()
        .refine((size) => !size || size <= VideoMaxFileSize, {
          message: `File size must not exceed ${VideoMaxFileSizeInMb} MB`,
        }),
      type: z.string().optional(),
    }),
    url: z.string().optional(),
    isThumbnail: z.boolean().optional(),
    base64Content: z.string().optional(),
  })
  .or(z.string());
