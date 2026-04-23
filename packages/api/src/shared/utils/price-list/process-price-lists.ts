import { MedusaContainer } from "@medusajs/framework"
import { INotificationModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MercurModules } from "@mercurjs/types"

import { createCustomPriceListsWorkflow } from "../../../workflows/price-list/workflows"
import { formatDuration } from "../date-utils"

const SELLER_MODULE = MercurModules.SELLER
const PRICE_LIST_BATCH_SIZE = 50

export type ProcessedPriceListPayload = {
  data: any
  submitter_id: string
}

export type ProcessPriceListsNotifyConfig = {
  to: string
  channel: string
  template: string
  redirect: string
}

export type ProcessPriceListsResult = {
  createdPriceLists: any[]
  failedCreates: Array<{ title: string; error: string }>
}

/**
 * Shared batch insert logic used by both:
 * - Direct insert path (PRICE_LIST_IMPORT_REQUIRE_APPROVAL=false)
 * - Request accept path (PRICE_LIST_IMPORT_REQUIRE_APPROVAL=true)
 */
export async function processPriceLists(
  container: MedusaContainer,
  processedPriceLists: ProcessedPriceListPayload[],
  seller_id: string,
  transaction_id: string,
  file_name: string,
  notify: ProcessPriceListsNotifyConfig,
  startTime: number
): Promise<void> {
  const notificationService =
    container.resolve<INotificationModuleService>(Modules.NOTIFICATION)
  const linkService = container.resolve(ContainerRegistrationKeys.LINK) as any

  const failedCreates: Array<{ title: string; error: string }> = []
  const createdPriceLists: any[] = []

  for (let i = 0; i < processedPriceLists.length; i += PRICE_LIST_BATCH_SIZE) {
    const batch = processedPriceLists.slice(i, i + PRICE_LIST_BATCH_SIZE)

    const batchResults = await Promise.allSettled(
      batch.map(async (payload) => {
        const { result } = await createCustomPriceListsWorkflow(container as any).run({
          input: { price_lists_data: [payload.data] },
          container: container as any,
        })
        const created = Array.isArray(result) ? result[0] : result
        if (created?.id) {
          await linkService.create([
            {
              [Modules.PRICING]: { price_list_id: created.id },
              [SELLER_MODULE]: { seller_id },
            },
          ])
        }
        return created
      })
    )

    batchResults.forEach((r, idx) => {
      const title = batch[idx]?.data?.title || `group_${i + idx + 1}`
      if (r.status === "fulfilled" && r.value) {
        createdPriceLists.push(r.value)
      } else {
        const reason: any = r.status === "rejected" ? r.reason : null
        failedCreates.push({
          title,
          error: reason?.message ?? String(reason ?? "Unknown error"),
        })
      }
    })
  }

  const formattedDuration = formatDuration(Date.now() - startTime)
  const successCount = createdPriceLists.length
  const failCount = failedCreates.length

  await notificationService.createNotifications({
    to: notify.to,
    channel: notify.channel,
    template: notify.template,
    content: {
      subject:
        failCount === 0
          ? "Price List Import Completed Successfully"
          : "Price List Import Completed (Partial)",
    },
    data: {
      title:
        failCount === 0
          ? "Import Completed Successfully"
          : "Import Completed (Partial)",
      description:
        failCount === 0
          ? `Price list import of "${file_name}" completed in ${formattedDuration}. Created ${successCount} price list(s).`
          : `Price list import of "${file_name}" completed in ${formattedDuration}. Created ${successCount} price list(s), ${failCount} group(s) failed.`,
      transaction_id,
      created_price_list_ids: createdPriceLists.map((p) => p.id).filter(Boolean),
      failed_groups: failCount ? failedCreates.slice(0, 25) : undefined,
      redirect: notify.redirect,
    },
  })
}
