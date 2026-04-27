import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { IEventBusModuleService, INotificationModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { exportCustomProductsWorkflow } from '../workflows/seller/workflows/export-custom-products'

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
  seller_id?: string
  brand_id?: string
  category_id?: string
  status?: string
  created_at?: string
  updated_at?: string
  tag_id?: string
  type_id?: string
  sales_channel_id?: string
}

export interface ProductExportBackgroundEventData {
  transaction_id: string
  user_id: string
  filters: ExportFilters
  notification: NotificationData
  redirectNotification: string
}

/**
 * Subscriber to handle background product export processing
 */
export default async function productExportBackgroundSubscriber({
  event,
  container,
}: SubscriberArgs<ProductExportBackgroundEventData>) {
  
  if (event.name === 'product-export.process-background') {
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
          message: 'Processing export in background...',
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
          message: 'Gathering product data...',
          timestamp: new Date()
        }
      })

      // Run the actual export workflow
      const { result: fileData } = await exportCustomProductsWorkflow.run({
        container,
        input: filters
      })

      if (!fileData?.url) {
        throw new Error('Export workflow did not return a valid file URL')
      }

      // Calculate duration
      const endTime = Date.now()
      const duration = endTime - startTime
      const formattedDuration = formatDuration(duration)

      // Determine if this is a vendor export based on the notification channel
      const isVendorExport = event.data.notification.channel === 'seller_feed'
      
      // Use S3 URL directly for all exports (same as order exports)
      // The file is stored in S3, so use the direct S3 URL
      const downloadUrl = fileData.url

      
      
      // Send completion notification
      await notificationService.createNotifications({
        to: user_id,
        channel: event.data.notification.channel, // Use the channel from the event data
        template: isVendorExport ? 'vendor-ui' : 'admin-ui',
        data: {
          title: `Product Export Completed`,
          description: `Your product export completed successfully in ${formattedDuration}. Click the download button below to get your file.`,
          file: {
            url: downloadUrl,
            filename: fileData.filename || `export-${transaction_id}.csv`,
            mimeType: 'text/csv'
          },
          file_id: fileData.id,
          transaction_id: transaction_id,
          export_type: 'product_export'
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

      console.log('Export completed successfully', {
        transaction_id,
        user_id,
        filters,
        redirectNotification,
        fileData
      })

    } catch (error) {
      // Calculate duration even for failed exports
      const endTime = Date.now()
      const duration = endTime - startTime
      const formattedDuration = formatDuration(duration)
      
      // Determine if this is a vendor export based on the notification channel
      const isVendorExport = event.data.notification.channel === 'seller_feed'
      
      // Send failure notification
      await notificationService.createNotifications({
        to: user_id,
        channel: event.data.notification.channel, // Use the channel from the event data
        template: isVendorExport ? 'vendor-ui' : 'admin-ui',
        content: {
          subject: `Product Export Failed`
        },
        data: {
          title: `Product Export Failed`,
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
    }
  }
}

export const config: SubscriberConfig = {
  event: ['product-export.process-background'],
}
