import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { IEventBusModuleService, INotificationModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { exportReturnsWorkflow } from '../workflows/returns/workflows/export-returns'

/**
 * Format duration from milliseconds to human readable format
 */
function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000)
  
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

interface NotificationData {
  to: string
  channel: string
  template: string
}

interface ExportFilters {
  status?: string
  created_at?: string
  updated_at?: string
  customer_id?: string
  order_id?: string
}

export interface ReturnsExportBackgroundEventData {
  transaction_id: string
  user_id: string
  filters: ExportFilters
  notification: NotificationData
  redirectNotification: string
}

/**
 * Subscriber to handle background returns export processing
 */
export default async function returnsExportBackgroundSubscriber({
  event,
  container,
}: SubscriberArgs<ReturnsExportBackgroundEventData>) {
  
  if (event.name === 'returns-export.process-background') {
    const { transaction_id, user_id, filters, redirectNotification } = event.data
    
    const eventBus: IEventBusModuleService = container.resolve(Modules.EVENT_BUS)
    const notificationService: INotificationModuleService = container.resolve(Modules.NOTIFICATION)
    
    // Track start time for duration calculation
    const startTime = Date.now()
    
    try {
      
      // Update status to processing
      await eventBus.emit({
        name: 'export.status.updated',
        data: {
          transaction_id,
          status: 'processing',
          progress: 10,
          message: 'Processing returns export in background...',
          timestamp: new Date()
        }
      })

      // Update progress for data gathering
      await eventBus.emit({
        name: 'export.status.updated',
        data: {
          transaction_id,
          status: 'processing',
          progress: 30,
          message: 'Gathering return data...',
          timestamp: new Date()
        }
      })

      // Run the actual export workflow
      const { result: fileData } = await exportReturnsWorkflow.run({
        container,
        input: filters
      })

      // Calculate duration
      const endTime = Date.now()
      const duration = endTime - startTime
      const formattedDuration = formatDuration(duration)

      // Create download URL (use S3 URL directly since file isn't registered in file module)
      const downloadUrl = fileData.url
      
      // Send completion notification
      await notificationService.createNotifications({
        to: user_id,
        channel: event.data.notification.channel,
        template: 'admin-ui',
        data: {
          title: `Returns Export Completed`,
          description: `Your returns export completed successfully in ${formattedDuration}. Click the download button below to get your file.`,
          file: {
            url: downloadUrl,
            filename: fileData.filename || `export-${transaction_id}.csv`,
            mimeType: 'text/csv'
          },
          file_id: fileData.id,
          transaction_id: transaction_id,
          export_type: 'returns_export'
        }
      })

      // Update status to completed
      await eventBus.emit({
        name: 'export.status.updated',
        data: {
          transaction_id,
          status: 'completed',
          progress: 100,
          message: `Export completed successfully`,
          timestamp: new Date(),
          result: {
            file: fileData,
            download_url: fileData.url
          }
        }
      })

    } catch (error) {
      console.error(`Background returns export failed for transaction: ${transaction_id}`, error)
      
      // Calculate duration even for failed exports
      const endTime = Date.now()
      const duration = endTime - startTime
      const formattedDuration = formatDuration(duration)
      
      // Send failure notification
      await notificationService.createNotifications({
        to: user_id,
        channel: event.data.notification.channel,
        template: 'admin-ui',
        content: {
          subject: `Returns Export Failed`
        },
        data: {
          title: `Returns Export Failed`,
          description: `Export failed after ${formattedDuration}: ${error.message}. Transaction ID: ${transaction_id}`,
          redirect: redirectNotification,
          transaction_id: transaction_id,
          error_message: error.message
        }
      })
      
      // Update status to failed
      await eventBus.emit({
        name: 'export.status.updated',
        data: {
          transaction_id,
          status: 'failed',
          progress: 0,
          message: `Export failed: ${error.message}`,
          timestamp: new Date(),
          error: error.message
        }
      })
      
      // Don't throw here to avoid crashing the subscriber
      console.error(`Background returns export subscriber error:`, error)
    }
  }
}

export const config: SubscriberConfig = {
  event: ['returns-export.process-background'],
}

