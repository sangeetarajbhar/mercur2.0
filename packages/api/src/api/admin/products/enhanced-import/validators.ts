import { z } from "zod"

export const AdminAppEnhaneProductImportType = z.object({
    file_key: z.string(),
    originalname: z.string().optional(),
    extension: z.string().optional(),
    size: z.number().optional(),
    mime_type: z.string().optional(),
    seller_id: z.string().optional(), // Our enhancement
})
