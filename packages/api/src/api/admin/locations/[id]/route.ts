import { AuthenticatedMedusaRequest, container, MedusaResponse } from "@medusajs/framework";
import { AdminUpdateStockLocationType } from "../../../../api/admin/locations/validators";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateStockLocationsWorkflow } from "../../../../workflows/stock-location/workflows/update-stock-locations";
import { STOCK_LOCATION_EXTENSION_MODULE } from "../../../../modules/stock-location-extension";
import StockLocationExtensionModuleService from "../../../../modules/stock-location-extension/service";
import { STOCK_LOCATION_SECTION_MODULE } from "../../../../modules/stock-location-section";
import StockLocationSectionModuleService from "../../../../modules/stock-location-section/service";
import { STOCK_LOCATION_CONTACT_MODULE } from "../../../../modules/stock-location-contact";
import StockLocationContactModuleService from "../../../../modules/stock-location-contact/service";
import { STOCK_LOCATION_DOCUMENT_MODULE } from "../../../../modules/stock-location-document";
import StockLocationDocumentModuleService from "../../../../modules/stock-location-document/service";
import { DocumentType, IsDelay } from '../../../../modules/stock-location-extension/types/common'
import { uploadToS3WithPath } from "../../../../shared/utils";
import { assignStockLocationToStockLocationSection } from "../../../../workflows/stock-location-section/workflows";
import { assignStockLocationToStockLocationExtension } from "../../../..//workflows/stock-location-extension/workflows";
import { assignStockLocationSectionToStockLocationDocument } from "../../../..//workflows/stock-location-document/workflows";
import { assignStockLocationSectionToStockLocationContact } from "../../../..//workflows/stock-location-contact/workflows";
import { upsertStockLocationCache, validateIfSellerPartnerWhCodeAlreadyExistsWhileUpdate } from "../../../../api/vendor/stock-locations/helpers";
import { RedisKey } from "../../../../shared/utils/redisKey";
import {
  refreshSellerPartnerStockLocationIdsCachesForPreviousAndNewSeller,
  refreshSellerPartnerStockLocationIdsCachesForSeller,
} from "../../../../shared/utils/cache/seller-partner-stock-location-ids-cache";
import CacheModuleService from "../../../../modules/cache/service";
import { MercurModules } from "@mercurjs/types";
import { IntermediateEvents } from "../../../../types/event";
const SELLER_MODULE = MercurModules.SELLER


export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateStockLocationType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.LINK)

  const userId = req.auth_context?.actor_id

  // console.log("validatedBody>>>>>>>>>>>>>", JSON.stringify(req.validatedBody, null, 2))
  const { additional_data, ...coreUpdateData } = req.validatedBody

  let currentSectionPartnerWhCode: string | null = null;
  let previousSectionPartnerWhCode: string | null = null;
  let previousSellerId: string | null = null;

  const sectionService = req.scope.resolve(STOCK_LOCATION_SECTION_MODULE) as StockLocationSectionModuleService
  let sections: any[] = [];
  // console.log("additional_data?.stock_location_section_id >>>>>>>>>>>>>>>>>", additional_data?.stock_location_section_id)
  if (additional_data?.stock_location_section_id) {
    sections = await sectionService.listStockLocationSections({
      id: additional_data.stock_location_section_id
    })
    // console.log("sections >>>>>>>>>>>>>>>>>", sections)

    currentSectionPartnerWhCode = sections[0].partner_wh_code
    previousSectionPartnerWhCode = sections[0].partner_wh_code
  }

  if (additional_data?.stock_location_section_id && Number(additional_data.address_type) === 3 && additional_data?.partner_wh_code) {
    //*checking if the warehouse code already exists for this seller
    const isExists = await validateIfSellerPartnerWhCodeAlreadyExistsWhileUpdate(additional_data?.seller_id as string, additional_data?.partner_wh_code as string, previousSectionPartnerWhCode as string)
    if (isExists) {
      return res.status(400).json({
        message: 'warehouse code already exists for this seller'
      })
    }
  }


  const stock_location_id = req.params.id

  let cacheUpdateFields = {};

  const seller = await knex("seller")
    .select("id", "name")
    .where({ id: additional_data?.seller_id })
    .first()

  const sellerStockLocationLink = await knex("stock_location_stock_location_seller_seller")
    .select("seller_id", "stock_location_id")
    .where({ stock_location_id: stock_location_id })
    .whereNull('deleted_at')
    .first()
  previousSellerId = sellerStockLocationLink?.seller_id


  // Update core stock location fields if any are provided
  if (Object.keys(coreUpdateData).length > 0) {
    const { result } = await updateStockLocationsWorkflow(req.scope).run({
      input: {
        selector: {
          id: stock_location_id
        },
        update: coreUpdateData
      }
    })
    if (result) {
      cacheUpdateFields = {
        ...cacheUpdateFields,
        name: coreUpdateData.name,
        address_id: (result as { address_id?: string }).address_id,
        ...coreUpdateData.address
      }
    }
    // console.log('cacheUpdateFieldsafter address+++++++++', cacheUpdateFields)


    if (sellerStockLocationLink) {
      // first remove the link and assign the new one
      await remoteLink.dismiss({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: stock_location_id
        },
        [SELLER_MODULE]: {
          seller_id: sellerStockLocationLink.seller_id
        },
      })

      await remoteLink.create({
        [Modules.STOCK_LOCATION]: {
          stock_location_id: stock_location_id
        },
        [SELLER_MODULE]: {
          seller_id: additional_data?.seller_id
        },
      })
    }
  }

  // Handle additional_data updates using direct service calls
  if (additional_data) {
    if (additional_data.stock_location_extension_id && additional_data.stock_location_section_id && additional_data.stock_location_contact_id) {
      try {
        /*Start - Update Stock Location Extension*/
        const extensionService = req.scope.resolve(STOCK_LOCATION_EXTENSION_MODULE) as StockLocationExtensionModuleService
        const extensions = await extensionService.listStockLocationExtensions({
          id: additional_data.stock_location_extension_id
        })

        if (extensions.length > 0) {
          const extensionUpdate: any = { id: extensions[0].id, updated_by: userId }

          const isDelay = additional_data.is_delay === IsDelay.TRUE
          const delayValue = isDelay && additional_data.delay_value ? additional_data.delay_value : null
          const delayMessage = isDelay && additional_data.delay_message ? additional_data.delay_message : null

          // if (additional_data.return_location_id !== undefined) extensionUpdate.return_location_id = additional_data.return_location_id
          if (additional_data.return_location_id !== undefined) {
            extensionUpdate.return_location_id =
              additional_data.return_location_id === "self"
                ? stock_location_id
                : additional_data.return_location_id
          }

          if (additional_data.latitude !== undefined) extensionUpdate.latitude = parseFloat(additional_data.latitude)
          if (additional_data.longitude !== undefined) extensionUpdate.longitude = parseFloat(additional_data.longitude)
          if (additional_data.status !== undefined) extensionUpdate.status = additional_data.status.toString()
          if (additional_data.servisibility_status !== undefined) extensionUpdate.servisibility_status = additional_data.servisibility_status.toString()
          if (additional_data.start_time !== undefined) extensionUpdate.start_time = additional_data.start_time
          if (additional_data.end_time !== undefined) extensionUpdate.end_time = additional_data.end_time
          if (additional_data.partner_id !== undefined) extensionUpdate.partner_id = additional_data.partner_id
          if (additional_data.location_type !== undefined) extensionUpdate.location_type = additional_data.location_type.toString()
          if (additional_data.address_type !== undefined) extensionUpdate.address_type = additional_data.address_type.toString()

          extensionUpdate.is_delay = isDelay
          extensionUpdate.delay_value = delayValue
          extensionUpdate.delay_message = delayMessage

          await extensionService.updateStockLocationExtensions(extensionUpdate)
          extensionUpdate.stock_location_extension_id = additional_data.stock_location_extension_id
          cacheUpdateFields = {
            ...cacheUpdateFields,
            ...extensionUpdate
          }

          // Emit event to trigger zone timing updates
          const eventBus = req.scope.resolve(Modules.EVENT_BUS)
          await eventBus.emit({
            name: 'stock-location-extension.updated',
            data: {
              id: additional_data.stock_location_extension_id
            }
          })

          /*End - Update Stock Location Extension*/

          /*Start - Update Stock Location Section*/
          // const sectionService = req.scope.resolve(STOCK_LOCATION_SECTION_MODULE) as StockLocationSectionModuleService
          // const sections = await sectionService.listStockLocationSections({
          //   id: additional_data.stock_location_section_id
          // })
          // currentSectionPartnerWhCode = sections[0].partner_wh_code


          if (sections.length > 0) {
            const sectionUpdate: any = { id: sections[0].id }

            if (additional_data.address_type !== undefined) sectionUpdate.address_type = additional_data.address_type.toString()
            if (additional_data.partner_wh_code !== undefined) sectionUpdate.partner_wh_code = additional_data.partner_wh_code
            if (additional_data.lead_time !== undefined) sectionUpdate.lead_time = additional_data.lead_time
            if (additional_data.managed_by !== undefined) sectionUpdate.managed_by = additional_data.managed_by

            await sectionService.updateStockLocationSections(sectionUpdate)
            sectionUpdate.stock_location_section_id = additional_data.stock_location_section_id
            cacheUpdateFields = {
              ...cacheUpdateFields,
              ...sectionUpdate
            }

            /*End - Update Stock Location Section*/

            /*Start - Update Stock Location Contact*/
            const contactService = req.scope.resolve(STOCK_LOCATION_CONTACT_MODULE) as StockLocationContactModuleService
            const contacts = await contactService.listStockLocationContacts({
              id: additional_data.stock_location_contact_id
            })

            if (contacts.length > 0) {
              const contactUpdate: any = { id: contacts[0].id }

              if (additional_data.first_name !== undefined) contactUpdate.first_name = additional_data.first_name
              if (additional_data.last_name !== undefined) contactUpdate.last_name = additional_data.last_name
              if (additional_data.email !== undefined) contactUpdate.email = additional_data.email
              if (coreUpdateData.address?.phone !== undefined) contactUpdate.phone_number = coreUpdateData.address?.phone

              await contactService.updateStockLocationContacts(contactUpdate)
              contactUpdate.stock_location_contact_id = additional_data.stock_location_contact_id
              cacheUpdateFields = {
                ...cacheUpdateFields,
                ...contactUpdate
              }
            }
            /*End - Update Stock Location Section*/

            /*Start - Update Stock Location Documents*/
            const documentService = req.scope.resolve(STOCK_LOCATION_DOCUMENT_MODULE) as StockLocationDocumentModuleService
            const allDocuments = await documentService.listStockLocationDocuments({
              stock_location_section_id: additional_data.stock_location_section_id
            })

            // Create a map for quick document lookup by type
            const documentMap = new Map()
            allDocuments.forEach(doc => {
              documentMap.set(doc.document_type.toString(), doc)
            })

            //document update logic for PAN, GST, FSSAI
            const documentTypes = [
              {
                condition: additional_data.pan_number !== undefined || ((additional_data.pan_pdf as any[])?.length > 0),
                type: DocumentType.PAN,
                number: additional_data.pan_number,
                file: additional_data.pan_pdf?.[0]
              },
              {
                condition: additional_data.gst_number !== undefined || ((additional_data.gst_pdf as any[])?.length > 0),
                type: DocumentType.GST,
                number: additional_data.gst_number,
                file: additional_data.gst_pdf?.[0]
              },
              {
                condition: additional_data.fssai_number !== undefined || ((additional_data.fssai_pdf as any[])?.length > 0),
                type: DocumentType.FSSAI,
                number: additional_data.fssai_number,
                file: additional_data.fssai_pdf?.[0]
              }
            ]

            for (const doc of documentTypes) {
              if (doc.condition) {
                try {
                  // Get existing document from the pre-fetched map
                  const existingDoc = documentMap.get(doc.type.toString())

                  if (existingDoc) {
                    const docUpdate: any = { id: existingDoc.id }

                    // Always update document number if provided
                    docUpdate.document_number = doc.number

                    // Handle file upload only if doc.file is an object and has base64Content
                    if (typeof doc.file === 'object' && doc.file !== null && 'base64Content' in doc.file && doc.file.base64Content) {
                      // console.log("Starting S3 upload for", DocumentType[doc.type])
                      try {
                        // Convert base64 to binary format for S3 upload
                        const base64Data = doc.file.base64Content.split(',')[1]
                        const fileBuffer = Buffer.from(base64Data, 'base64')

                        // Generate organized filename with seller info and date
                        const now = new Date()
                        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` // yyyy-mm
                        const fullDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` // yyyy-mm-dd
                        const documentTypeName = DocumentType[doc.type].toLowerCase() // pan, gst, fssai
                        const sellerName = seller.name.replace(/\s+/g, '')

                        const fileNameWithPath = `documents/${yearMonth}/${seller.id}/${documentTypeName}/${sellerName}_${documentTypeName}_${stock_location_id}_${fullDate}.pdf`

                        // Upload file to S3
                        await uploadToS3WithPath(
                          fileNameWithPath,
                          fileBuffer,
                          doc.file.file?.type || 'application/pdf'
                        )

                        // Update document record with new S3 URL
                        docUpdate.pdf_url = fileNameWithPath
                      } catch (uploadError) {
                        console.error(`Failed to upload ${DocumentType[doc.type]} to S3:`, uploadError)
                        // throw uploadError // Re-throw to catch outer block
                      }
                    } else {
                      console.log("No new file to upload, keeping existing URL")
                    }

                    // Update document record in database

                    await documentService.updateStockLocationDocuments(docUpdate)

                  } else {
                    console.log("No existing document found, cannot update")
                  }
                } catch (error) {
                  console.error(`Error processing ${DocumentType[doc.type]} document:`, error)
                  // throw error // Re-throw to see full error
                }
              }
            }
            /*End - Update Stock Location Documents*/
          }
        }
      } catch (error) {
        console.error('Admin - Error updating stock location data:', error)
      }
    }



    // This condition will only work if any location is existed(inserted record by seed) before the table creation of stock_location_extension, stock_location_section and stock_location_contact
    if (!additional_data.stock_location_extension_id && !additional_data.stock_location_section_id && !additional_data.stock_location_contact_id) {
      try {
        /*Start - Update Stock Location Extension*/
        const stockLocationExtension = await assignStockLocationToStockLocationExtension.run({
          container: req.scope,
          input: {
            stock_location_id: stock_location_id,
            location_type: additional_data.location_type.toString(),
            address_type: additional_data.address_type.toString(),
            latitude: parseFloat(additional_data.latitude),
            longitude: parseFloat(additional_data.longitude),
            partner_id: additional_data.partner_id,
            return_location_id: additional_data.return_location_id,
            status: additional_data.status.toString(),
            servisibility_status: additional_data.servisibility_status.toString(),
            start_time: additional_data.start_time,
            end_time: additional_data.end_time,
            created_by: userId,
            updated_by: userId,
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
              managed_by: additional_data.managed_by,
            }
          })

          if (stockLocationSection.result?.id) {
            const documentTypes = [
              {
                condition: additional_data.pan_number && (additional_data.pan_pdf as any[])?.length > 0,
                type: DocumentType.PAN,
                number: additional_data.pan_number,
                file: (additional_data.pan_pdf as any[])[0] // Full file object with base64Content
              },
              {
                condition: additional_data.gst_number && (additional_data.gst_pdf as any[])?.length > 0,
                type: DocumentType.GST,
                number: additional_data.gst_number,
                file: (additional_data.gst_pdf as any[])[0] // Full file object with base64Content
              },
              {
                condition: additional_data.fssai_number && (additional_data.fssai_pdf as any[])?.length > 0,
                type: DocumentType.FSSAI,
                number: additional_data.fssai_number,
                file: (additional_data.fssai_pdf as any[])[0] // Full file object with base64Content
              }
            ]

            for (const doc of documentTypes) {
              if (doc.condition && doc.file?.base64Content) {
                try {
                  // Convert base64 to binary format for Medusa upload
                  const base64Data = doc.file.base64Content.split(',')[1] // Remove data:application/pdf;base64, prefix
                  const fileBuffer = Buffer.from(base64Data, 'base64') // Convert to Buffer instead of binary string

                  // Generate organized filename with seller info and date
                  const now = new Date()
                  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` // yyyy-mm
                  const fullDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` // yyyy-mm-dd
                  const documentTypeName = DocumentType[doc.type].toLowerCase() // pan, gst, fssai
                  const sellerName = seller.name.replace(/\s+/g, '')

                  const fileNameWithPath = `documents/${yearMonth}/${seller.id}/${documentTypeName}/${sellerName}_${documentTypeName}_${stock_location_id}_${fullDate}.pdf`

                  // Upload file to S3 using custom uploadToS3WithPath function
                  const fileUrl = await uploadToS3WithPath(
                    fileNameWithPath,
                    fileBuffer,
                    doc.file.file?.type || 'application/pdf'
                  );

                  if (fileUrl) {
                    // Create document record with permanent S3 URL
                    await assignStockLocationSectionToStockLocationDocument.run({
                      container: req.scope,
                      input: {
                        stock_location_section_id: stockLocationSection.result?.id,
                        document_type: doc.type,
                        document_number: doc.number,
                        pdf_url: fileNameWithPath, // only store file path, s3 URL can be changed in future
                      }
                    })
                  }
                } catch (error) {
                  console.error(`Admin - Failed to upload ${DocumentType[doc.type]} document to S3:`, error)
                }
              }
            }

            await assignStockLocationSectionToStockLocationContact.run({
              container: req.scope,
              input: {
                stock_location_section_id: stockLocationSection.result?.id,
                first_name: additional_data.first_name,
                last_name: additional_data.last_name,
                email: additional_data.email,
                phone_number: coreUpdateData.address?.phone,
              }
            })
          }
        }
        /*End - Update Stock Location Extension*/
      } catch (error) {
        console.error('Admin - Error updating existing stock location data:', error)
      }
    }

  }

  // console.log("cacheUpdateFields >>>>>>>>>>>>>>>>>", cacheUpdateFields, "additional_data?.partner_wh_code", additional_data?.partner_wh_code)
  let partnerStockLocationListCachesDirty = false
  /** Warehouse Redis row pointed at a seller that is neither link-previous nor current payload (rare); needs its own rebuild */
  let warehouseCacheStaleSellerId: string | null = null

  if (Object.keys(cacheUpdateFields).length > 0 && additional_data?.partner_wh_code) {
    // console.log('cacheUpdateFieldsupdating cache', cacheUpdateFields)

    const cacheService = container.resolve<CacheModuleService>(Modules.CACHE)

    //*changing the address_type to shipping
    if (!currentSectionPartnerWhCode && additional_data.address_type === 3 && Number(sections[0].address_type) !== 3) {
      // console.log("changing the address_type to shipping >>>>>>>>>>>>>>>>>")

      const toCacheFields = {
        ...additional_data,
        ...cacheUpdateFields,
        stock_location_id: stock_location_id,
        name: req.validatedBody.name,
        ...req.validatedBody.address,
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
      partnerStockLocationListCachesDirty = true
    } else if (currentSectionPartnerWhCode && Number(additional_data.address_type) === 3) {
      //*updating previously existing cache
      // console.log("updating previously existing cache >>>>>>>>>>>>>>>>>")
      let key = '';
      if (previousSellerId !== additional_data?.seller_id) {
        key = `${RedisKey.STOCK_LOCATION_CACHE}:${previousSellerId}:${currentSectionPartnerWhCode}`
      } else {
        key = `${RedisKey.STOCK_LOCATION_CACHE}:${additional_data?.seller_id}:${currentSectionPartnerWhCode}`
      }
      let locationCache: any = await cacheService.get(key);

      if (locationCache && typeof locationCache === 'string') {
        locationCache = JSON.parse(locationCache)
      }

      // Partner wh / seller on cached row changed vs request (includes seller reassignment)
      if (
        locationCache &&
        ((additional_data.partner_wh_code &&
          locationCache.partner_wh_code !== additional_data.partner_wh_code) ||
          seller.id !== locationCache.seller_id ||
          previousSellerId !== additional_data.seller_id)
      ) {
        if (typeof locationCache.seller_id === 'string') {
          const staleId = locationCache.seller_id.trim()
          if (staleId) {
            warehouseCacheStaleSellerId = staleId
          }
        }
        const keyToDelete = `${RedisKey.STOCK_LOCATION_CACHE}:${locationCache.seller_id}:${locationCache.partner_wh_code}`
        await cacheService.invalidate(keyToDelete)
        partnerStockLocationListCachesDirty = true
      }

      if (locationCache) {
        const updatedLocationCacheData = {
          ...locationCache,

          ...additional_data,
          stock_location_id: stock_location_id,
          name: req.validatedBody.name,
          ...req.validatedBody.address,
          extension_status: additional_data.status,
          return_location_id:
            additional_data.return_location_id === 'self'
              ? stock_location_id
              : additional_data.return_location_id,
          gst_number: additional_data.gst_number,
          fssai_number: additional_data.fssai_number,
          pan_number: additional_data.pan_number,
        }

        try {
          await upsertStockLocationCache(updatedLocationCacheData)
          partnerStockLocationListCachesDirty = true
        } catch (error) {
          console.error('Admin - Error updating stock location cache:', error)
        }
      } else {
        // If cache doesn't exist, create it (as requested: on location edit if cache doesn't exist we should create but only if location type is shipping)
        const toCacheFields = {
          ...additional_data,
          ...cacheUpdateFields,
          stock_location_id: stock_location_id,
          name: req.validatedBody.name,
          ...req.validatedBody.address,
          extension_status: additional_data.status,
          return_location_id:
            additional_data.return_location_id === 'self'
              ? stock_location_id
              : additional_data.return_location_id,
          gst_number: additional_data.gst_number,
          fssai_number: additional_data.fssai_number,
          pan_number: additional_data.pan_number,
        }

        try {
          await upsertStockLocationCache(toCacheFields)
          partnerStockLocationListCachesDirty = true
        } catch (error) {
          console.error('Admin - Error creating missing stock location cache:', error)
        }
      }
    }
  } else if (currentSectionPartnerWhCode && Number(additional_data?.address_type) !== 3 && additional_data?.seller_id === previousSellerId) {
    // console.log("changing the address_type to non-shipping invalidating the cache >>>>>>>>>>>>>>>>>")
    //*changing the address_type to non-shipping invalidating the cache
    const cacheService = container.resolve<CacheModuleService>(Modules.CACHE)

    if (typeof additional_data?.seller_id === 'string') {
      const keyToDelete = `${RedisKey.STOCK_LOCATION_CACHE}:${additional_data.seller_id}:${currentSectionPartnerWhCode}`
      await cacheService.invalidate(keyToDelete)
      partnerStockLocationListCachesDirty = true
    }
  }
  else if (previousSectionPartnerWhCode && previousSellerId !== additional_data?.seller_id && Number(additional_data?.address_type) !== 3) {
    // console.log("changing the address_type and seller to non-shipping to different invalidating the cache >>>>>>>>>>>>>>>>>")
    const cacheService = container.resolve<CacheModuleService>(Modules.CACHE)

    //*changing the address_type and seller to non-shipping to different  invalidating the cache
    if (previousSellerId) {
      const keyToDelete = `${RedisKey.STOCK_LOCATION_CACHE}:${previousSellerId}:${previousSectionPartnerWhCode}`
      await cacheService.invalidate(keyToDelete)
    }

    partnerStockLocationListCachesDirty = true
  }

  if (partnerStockLocationListCachesDirty) {
    const cacheService = container.resolve<CacheModuleService>(Modules.CACHE)
    const currentSellerIdForPartnerCache =
      typeof additional_data?.seller_id === 'string'
        ? additional_data.seller_id
        : seller?.id

    await refreshSellerPartnerStockLocationIdsCachesForPreviousAndNewSeller(
      cacheService,
      previousSellerId,
      currentSellerIdForPartnerCache
    )

    if (
      warehouseCacheStaleSellerId &&
      warehouseCacheStaleSellerId !== previousSellerId &&
      warehouseCacheStaleSellerId !== currentSellerIdForPartnerCache
    ) {
      await refreshSellerPartnerStockLocationIdsCachesForSeller(
        cacheService,
        warehouseCacheStaleSellerId
      )
    }
  }

  const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: IntermediateEvents.STOCK_LOCATION_CHANGED,
    data: { id: stock_location_id }
  })

  const {
    data: [stockLocation]
  } = await query.graph(
    {
      entity: 'stock_location',
      fields: req.queryConfig.fields,
      filters: {
        id: stock_location_id
      }
    },
    { throwIfKeyNotFound: true }
  )

  res.status(200).json({
    stock_location: stockLocation
  })
}
