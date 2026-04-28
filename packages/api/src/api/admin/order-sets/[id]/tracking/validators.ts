import { z } from 'zod'

export type AdminUpdateTrackingType = z.infer<typeof AdminUpdateTracking>
export const AdminUpdateTracking = z.object({
  tracking_id: z.string().min(1),
  courier_code: z.string().min(1)
}).strict()
