import { z } from "zod";

export const StoreUploadFileSchema = z.object({
  file_name: z.string().min(1, "File name is required"),
  content: z.string().min(1, "File content is required"),
  mime_type: z.string().optional(),
});

export type StoreUploadFileSchemaType = z.infer<typeof StoreUploadFileSchema>;
