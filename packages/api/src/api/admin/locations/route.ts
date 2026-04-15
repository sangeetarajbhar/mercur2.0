
import { AdminUpsertStockLocationAddressType } from '../../../api/admin/locations/validators'
import { upsertStockLocationCache, validateIfSellerPartnerWhCodeAlreadyExists } from '../../../api/vendor/stock-locations/helpers'

import {
  DocumentType,
  IsDelay
} from '../../../modules/stock-location-extension/types/common'
import { uploadToS3WithPath } from '../../../shared/utils'
import { assignStockLocationSectionToStockLocationContact } from '../../../workflows/stock-location-contact/workflows'
import { assignStockLocationSectionToStockLocationDocument } from '../../../workflows/stock-location-document/workflows'
import { assignStockLocationToStockLocationExtension } from '../../../workflows/stock-location-extension/workflows'
import { assignStockLocationToStockLocationSection } from '../../../workflows/stock-location-section/workflows'
import { createStockLocationsWorkflow } from '../../../workflows/stock-location/workflows'

import { linkSalesChannelsToStockLocationWorkflow } from '@medusajs/medusa/core-flows'
import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import CacheModuleService from '../../../modules/cache/service'
import { refreshSellerPartnerStockLocationIdsCachesForSeller } from '../../../shared/utils/cache/seller-partner-stock-location-ids-cache'
import { refetchStockLocation } from '@medusajs/medusa/api/admin/stock-locations/helpers'
import { addDefaultZoneAndOptions } from '../../../workflows/stock-location/workflows/add-default-zone';
import { MercurModules } from '@mercurjs/types'
const SELLER_MODULE = MercurModules.SELLER
import { IntermediateEvents } from '../../../types/event'
import { CreateLocationSchemaTypeResponse } from './validators'

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateLocationSchemaTypeResponse>,
  res: MedusaResponse
) => {
  // console.log("before validatedBody >>>>>>>>>>>>>>>>>>>>>")
  const { additional_data, ...validatedBody } = req.validatedBody

  const userId = req.auth_context?.actor_id
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const link = req.scope.resolve("link")
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  
  // Get default sales channel from store (instead of medusa created one)
  const store = await knex("store")
    .select("default_sales_channel_id")
    .whereNull("deleted_at")
    .first()
    
  const seller = await knex('seller')
    .select('id', 'name')
    .where({ id: additional_data?.seller_id })
    .first()


  if (additional_data?.seller_id && additional_data?.partner_wh_code) {
    //*checking if the warehouse code already exists for this seller
    const isExists = await validateIfSellerPartnerWhCodeAlreadyExists(additional_data?.seller_id as string, additional_data?.partner_wh_code as string)
    if (isExists) {
      return res.status(400).json({
        message: 'warehouse code already exists for this seller'
      })
    }

  }

  const { result } = await createStockLocationsWorkflow(req.scope).run({
    input: { locations: [validatedBody] }
  })

  const stock_location_id = result[0].id

  await remoteLink.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stock_location_id
    },
    [SELLER_MODULE]: {
      seller_id: additional_data?.seller_id
    }
  })

  // Use default_sales_channel_id from store instead of medusa created sales channel
  const add = store?.default_sales_channel_id ? [store.default_sales_channel_id] : []

  // Assign default sales channels
  const workflow = linkSalesChannelsToStockLocationWorkflow(req.scope)
  await workflow.run({
    input: {
      id: stock_location_id,
      add
    }
  })



  const address: AdminUpsertStockLocationAddressType | undefined = req.validatedBody.address
  if (additional_data && stock_location_id) {
    const isDelay = additional_data.is_delay === IsDelay.TRUE
    const delayValue =
      isDelay && additional_data.delay_value
        ? additional_data.delay_value
        : null
    const delayMessage =
      isDelay && additional_data.delay_message
        ? additional_data.delay_message
        : null

    const stockLocationExtension =
      await assignStockLocationToStockLocationExtension.run({
        container: req.scope,
        input: {
          stock_location_id: stock_location_id,
          location_type: additional_data.location_type,
          address_type: additional_data.address_type,
          latitude: additional_data.latitude,
          longitude: additional_data.longitude,
          partner_id: additional_data.partner_id,
          return_location_id:
            additional_data.return_location_id === 'self'
              ? stock_location_id
              : additional_data.return_location_id,
          status: additional_data.status,
          servisibility_status: additional_data.servisibility_status,
          start_time: additional_data.start_time,
          end_time: additional_data.end_time,
          is_delay: isDelay,
          delay_value: delayValue,
          delay_message: delayMessage,
          created_by: userId,
          updated_by: userId
        }
      })

    if (stockLocationExtension?.result?.id) {
      const stockLocationSection = await assignStockLocationToStockLocationSection.run({
        container: req.scope,
        input: {
          stock_location_id: stock_location_id,
          address_type: additional_data.address_type,
          partner_wh_code: additional_data.partner_wh_code,
          lead_time: additional_data.lead_time,
          managed_by: additional_data.managed_by
        }
      })
      if (stockLocationSection.result?.id) {
        const extractProvidedPdfUrl = (file: any): string | undefined => {
          const raw =
            file?.url ??
            file?.pdf_url ??
            file?.pdfUrl ??
            file?.file_url ??
            file?.fileUrl ??
            file?.path

          if (typeof raw !== "string" || !raw.trim()) {
            return undefined
          }

          if (raw.startsWith("blob:")) {
            return undefined
          }

          return raw
        }

        const documentTypes = [
          {
            condition:
              additional_data.pan_number !== undefined ||
              (additional_data.pan_pdf as any[])?.length > 0,
            type: DocumentType.PAN,
            number: additional_data.pan_number,
            file: (additional_data.pan_pdf as any[])[0], // Full file object with base64Content
          },
          {
            condition:
              additional_data.gst_number !== undefined ||
              (additional_data.gst_pdf as any[])?.length > 0,
            type: DocumentType.GST,
            number: additional_data.gst_number,
            file: (additional_data.gst_pdf as any[])[0], // Full file object with base64Content
          },
          {
            condition:
              additional_data.fssai_number !== undefined ||
              (additional_data.fssai_pdf as any[])?.length > 0,
            type: DocumentType.FSSAI,
            number: additional_data.fssai_number,
            file: (additional_data.fssai_pdf as any[])[0], // Full file object with base64Content
          },
        ]

        for (const doc of documentTypes) {
          if (!doc.condition) {
            continue
          }

          try {
            let pdfUrlToPersist = extractProvidedPdfUrl(doc.file)

            if (
              typeof doc.file === "object" &&
              doc.file !== null &&
              "base64Content" in doc.file &&
              doc.file.base64Content
            ) {
              // Convert base64 to binary format for Medusa upload
              const base64Data = doc.file.base64Content.split(",")[1] // Remove data:application/pdf;base64, prefix
              const fileBuffer = Buffer.from(base64Data, "base64")

              // Generate organized filename with seller info and date
              const now = new Date()
              const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}` // yyyy-mm
              const fullDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` // yyyy-mm-dd
              const documentTypeName = DocumentType[doc.type].toLowerCase() // pan, gst, fssai
              const sellerName = (seller?.name || "seller").replace(/\s+/g, "")
              const sellerId = seller?.id || additional_data?.seller_id || "unknown"

              const fileNameWithPath = `documents/${yearMonth}/${sellerId}/${documentTypeName}/${sellerName}_${documentTypeName}_${stock_location_id}_${fullDate}.pdf`
              // Upload file to S3 using custom uploadToS3WithPath function
              const fileUrl = await uploadToS3WithPath(
                fileNameWithPath,
                fileBuffer,
                doc.file.file?.type || "application/pdf"
              )

              pdfUrlToPersist = fileUrl
                ? fileNameWithPath // only store file path, s3 URL can be changed in future
                : (doc.file.base64Content as string | undefined)
            }

            if (pdfUrlToPersist) {
              await assignStockLocationSectionToStockLocationDocument.run({
                container: req.scope,
                input: {
                  stock_location_section_id: stockLocationSection.result?.id,
                  document_type: doc.type,
                  document_number: doc.number || "",
                  pdf_url: pdfUrlToPersist,
                },
              })
            }
          } catch (error) {
            console.error(
              `Admin - Failed to upload ${DocumentType[doc.type]} document to S3:`,
              error
            )
          }
        }

        // Link Manual Provider with stock location Module
        const { data: provider } = await query.graph({
          entity: "fulfillment_provider",
          fields: ["*"],
          // filters: { name: "manual_manual" },
        })

        if (provider && provider.length > 0) {
          await link.create({
            [Modules.STOCK_LOCATION]: { stock_location_id: stock_location_id },
            [Modules.FULFILLMENT]: { fulfillment_provider_id: provider[0].id }
          })
        }

        const inputObj = {
          stock_location_id: stock_location_id,
          location_name: validatedBody.name,
          seller_id: additional_data?.seller_id as string,
        }

        //Assign Default Zone and Options to the Stock Location For Shipping and Pickup
        addDefaultZoneAndOptions(req.scope).run({
          input: {
            ...inputObj,
            set: { name: `Shipping`, type: "shipping" }
          }
        })

        addDefaultZoneAndOptions(req.scope).run({
          input: {
            ...inputObj,
            set: { name: `Pick-up`, type: "pickup" }
          }
        })


        await assignStockLocationSectionToStockLocationContact.run({
          container: req.scope,
          input: {
            stock_location_section_id: stockLocationSection.result?.id,
            first_name: additional_data.first_name,
            last_name: additional_data.last_name,
            email: additional_data.email,
            phone_number: address?.phone
          }
        })

        // console.log("before cache")
        //*if the address_type is shipping, then upsert the cache
        if (Number(additional_data.address_type) === 3) {
          try {

            const toCacheFields = {
              ...additional_data,
              seller_id: additional_data.seller_id,
              stock_location_id: stock_location_id,
              name: validatedBody.name,
              ...validatedBody.address,
              extension_status: additional_data.status,
              return_location_id:
                additional_data.return_location_id === 'self'
                  ? stock_location_id
                  : additional_data.return_location_id,
              gst_number: additional_data.gst_number,
              fssai_number: additional_data.fssai_number,
              pan_number: additional_data.pan_number,
            }
            await upsertStockLocationCache(toCacheFields)

            const sellerIdForPartnerCache = additional_data.seller_id
            if (typeof sellerIdForPartnerCache === 'string' && sellerIdForPartnerCache) {
              const cacheService =
                req.scope.resolve<CacheModuleService>(Modules.CACHE)
              await refreshSellerPartnerStockLocationIdsCachesForSeller(
                cacheService,
                sellerIdForPartnerCache
              )
            }
          } catch (error) {
            console.error('Admin - Error upserting stock location cache:', error)
          }
        }
      }
    }
  }

  const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: IntermediateEvents.STOCK_LOCATION_CHANGED,
    data: { id: result[0].id }
  })

  const stockLocation = await refetchStockLocation(
    result[0].id,
    req.scope,
    req.queryConfig.fields
  )

  res.status(200).json({ stock_location: stockLocation })
}

