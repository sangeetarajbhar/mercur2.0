import { container, MedusaResponse } from '@medusajs/framework'
import { AuthenticatedMedusaRequest } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  // deleteStockLocationsWorkflow,
  updateStockLocationsWorkflow
} from '@medusajs/medusa/core-flows'


import { VendorUpdateStockLocationType } from '../validators'
import { fetchSellerByAuthActorId } from '../../../../shared/infra/http/utils'
import { STOCK_LOCATION_EXTENSION_MODULE } from '../../../../modules/stock-location-extension'
import { STOCK_LOCATION_SECTION_MODULE } from '../../../../modules/stock-location-section'
import { STOCK_LOCATION_CONTACT_MODULE } from '../../../../modules/stock-location-contact'
import { STOCK_LOCATION_DOCUMENT_MODULE } from '../../../../modules/stock-location-document'
import StockLocationExtensionModuleService from "../../../../modules/stock-location-extension/service";
import StockLocationSectionModuleService from "../../../../modules/stock-location-section/service";
import StockLocationContactModuleService from "../../../../modules/stock-location-contact/service";
import StockLocationDocumentModuleService from "../../../../modules/stock-location-document/service";
import { DocumentType } from "../../../../modules/stock-location-extension/types/common";
import { uploadToS3WithPath } from "../../../../shared/utils";
import { upsertStockLocationCache, validateIfSellerPartnerWhCodeAlreadyExistsWhileUpdate } from "../../../../api/vendor/stock-locations/helpers";
import { RedisKey } from "../../../../shared/utils/redisKey";
import { refreshSellerPartnerStockLocationIdsCachesForSeller } from "../../../../shared/utils/cache/seller-partner-stock-location-ids-cache";
import CacheModuleService from "../../../../modules/cache/service";
import { IntermediateEvents } from '../../../../types/event'




export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [stockLocation]
  } = await query.graph(
    {
      entity: 'stock_location',
      fields: req.queryConfig.fields,
      filters: {
        id: req.params.id
      }
    },
    { throwIfKeyNotFound: true }
  )

  // Append the S3 url
  const S3_BASE_URL = process.env.S3_FILE_URL
  if (stockLocation?.stock_location_section?.stock_location_documents && Array.isArray(stockLocation.stock_location_section.stock_location_documents)) {
    stockLocation.stock_location_section.stock_location_documents =
      stockLocation.stock_location_section.stock_location_documents.map((doc: any) => ({
        ...doc,
        pdf_url: doc?.pdf_url
          ? `${S3_BASE_URL}/${doc.pdf_url.replace(/^\/+/, '')}`
          : doc?.pdf_url,
      }))
  }

  res.status(200).json({
    stock_location: stockLocation
  })
}

/**
 * @oas [post] /vendor/stock-locations/{id}
 * operationId: "VendorUpdateStockLocation"
 * summary: "Update Stock Location"
 * description: "Updates a Stock Location."
 * x-authenticated: true
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             stock_location:
 *               $ref: "#/components/schemas/VendorStockLocation"
 * tags:
 *   - Vendor Stock Locations
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<VendorUpdateStockLocationType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope
  )
  let cacheUpdateFields = {};
  let currentSectionPartnerWhCode: string | null = null;
  let previousSectionPartnerWhCode: string | null = null;

  // console.log('validatedBody>>>>>>>>>>>>>>>>>>', req.validatedBody)
  const { additional_data, ...coreUpdateData } = req.validatedBody


  //get the section data to get previous partner wh code and section id
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
  //check if same wh name already exists for the same seller
  if (additional_data?.stock_location_section_id && Number(additional_data.address_type) === 3 && additional_data?.partner_wh_code) {
    const isExists = await validateIfSellerPartnerWhCodeAlreadyExistsWhileUpdate(seller.id as string, additional_data?.partner_wh_code as string, previousSectionPartnerWhCode as string)
    if (isExists) {
      return res.status(400).json({
        message: 'warehouse code already exists for this seller'
      })
    }
  }
  const stock_location_id = req.params.id
  // console.log("stock_location_id >>>>>>>>>>>>>>>>>", stock_location_id)

  // Update core stock location fields if any are provided
  if (Object.keys(coreUpdateData).length > 0) {
    const { result } = await updateStockLocationsWorkflow(req.scope).run({
      input: {
        selector: {
          id: req.params.id
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
          const extensionUpdate: any = { id: extensions[0].id, updated_by: seller.id }

          if (additional_data.return_location_id !== undefined) extensionUpdate.return_location_id = additional_data.return_location_id === "self" ? req.params.id : additional_data.return_location_id
          if (additional_data.latitude !== undefined) extensionUpdate.latitude = parseFloat(additional_data.latitude)
          if (additional_data.longitude !== undefined) extensionUpdate.longitude = parseFloat(additional_data.longitude)
          if (additional_data.status !== undefined) extensionUpdate.status = additional_data.status.toString()
          if (additional_data.servisibility_status !== undefined) extensionUpdate.servisibility_status = additional_data.servisibility_status.toString()
          if (additional_data.start_time !== undefined) extensionUpdate.start_time = additional_data.start_time
          if (additional_data.end_time !== undefined) extensionUpdate.end_time = additional_data.end_time
          if (additional_data.partner_id !== undefined) extensionUpdate.partner_id = additional_data.partner_id
          if (additional_data.location_type !== undefined) extensionUpdate.location_type = additional_data.location_type.toString()
          if (additional_data.address_type !== undefined) extensionUpdate.address_type = additional_data.address_type.toString()

          const stockLocationExtension = await extensionService.updateStockLocationExtensions(extensionUpdate)
          extensionUpdate.stock_location_extension_id = additional_data.stock_location_extension_id
          cacheUpdateFields = {
            ...cacheUpdateFields,
            ...extensionUpdate
          }
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

                  // Handle file upload only if base64Content is present, if user is uploading a new file
                  if (doc.file?.base64Content) {
                    try {
                      // Convert base64 to binary format for S3 upload
                      const base64Data = doc.file.base64Content.split(',')[1] // Remove data:application/pdf;base64, prefix
                      const fileBuffer = Buffer.from(base64Data, 'base64')

                      // Generate organized filename with seller info and date
                      const now = new Date()
                      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` // yyyy-mm
                      const fullDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` // yyyy-mm-dd
                      const documentTypeName = DocumentType[doc.type].toLowerCase() // pan, gst, fssai
                      const sellerName = seller.name.replace(/\s+/g, '')

                      const fileNameWithPath = `documents/${yearMonth}/${seller.id}/${documentTypeName}/${sellerName}_${documentTypeName}_${req.params.id}_${fullDate}.pdf`

                      // Upload file to S3 using custom uploadToS3WithPath function
                      await uploadToS3WithPath(
                        fileNameWithPath,
                        fileBuffer,
                        doc.file.file?.type || 'application/pdf'
                      )
                      // console.log("fileNameWithPath", fileNameWithPath)

                      // Update document record with new S3 URL
                      docUpdate.pdf_url = fileNameWithPath
                    } catch (uploadError) {
                      console.error(`Failed to upload ${DocumentType[doc.type]} document to S3:`, uploadError)
                    }
                  }

                  // Update document record in database
                  const updatedDoc = await documentService.updateStockLocationDocuments(docUpdate)

                }
              } catch (error) {
                console.error(`Error updating ${DocumentType[doc.type]} document:`, error)
              }
            }
          }
          /*End - Update Stock Location Documents*/
        }
        // console.log("cacheUpdateFields>>>>>>>>>>>>>>>>>>", cacheUpdateFields)

        const cacheService = container.resolve<CacheModuleService>(Modules.CACHE)
        if (!currentSectionPartnerWhCode && additional_data.address_type === 3 && Number(sections[0].address_type) !== 3) {
          //changing the address_type to shipping, generate cache
          // console.log("changing the address_type to shipping >>>>>>>>>>>>>>>>>")

          // const cacheUpdateFields = {
          //   ...cacheUpdateFields
          // }

          const toCacheFields = {
            ...additional_data,
            ...cacheUpdateFields,
            seller_id: seller.id,
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

          await refreshSellerPartnerStockLocationIdsCachesForSeller(
            cacheService,
            seller.id
          )
          // console.log('toCacheFields when adding cache', toCacheFields)

          // console.log('currentSectionPartnerWhCode not found', currentSectionPartnerWhCode)
          // return;
        } else if (currentSectionPartnerWhCode && Number(additional_data.address_type) === 3) {
          const key = `${RedisKey.STOCK_LOCATION_CACHE}:${seller.id}:${currentSectionPartnerWhCode}`
          let locationCache: any = await cacheService.get(key)

          if (locationCache && typeof locationCache === 'string') {
            locationCache = JSON.parse(locationCache)
          }

          if (
            locationCache &&
            ((additional_data.partner_wh_code &&
              locationCache.partner_wh_code !== additional_data.partner_wh_code) ||
              seller.id !== locationCache.seller_id)
          ) {
            const keyToDelete = `${RedisKey.STOCK_LOCATION_CACHE}:${locationCache.seller_id}:${locationCache.partner_wh_code}`
            await cacheService.invalidate(keyToDelete)
          }

          const cachePayload = {
            ...(locationCache ?? {}),
            ...additional_data,
            seller_id: seller.id,
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
            await upsertStockLocationCache(cachePayload)

            await refreshSellerPartnerStockLocationIdsCachesForSeller(
              cacheService,
              seller.id
            )
          } catch (error) {
            console.error('Vendor - Error upserting stock location cache:', error)
          }
        } else if (currentSectionPartnerWhCode && Number(additional_data?.address_type) !== 3) {
          //changing the address_type to non-shipping invalidating the cache
          const keyToDelete = `${RedisKey.STOCK_LOCATION_CACHE}:${seller.id}:${currentSectionPartnerWhCode}`

          await cacheService.invalidate(keyToDelete)
          await refreshSellerPartnerStockLocationIdsCachesForSeller(
            cacheService,
            seller.id
          )
        }

      } catch (error) {
        console.error('Error updating stock location data:', error)
      }
    }
  }

  const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: IntermediateEvents.STOCK_LOCATION_CHANGED,
    data: { id: req.params.id }
  })

  const {
    data: [stockLocation]
  } = await query.graph(
    {
      entity: 'stock_location',
      fields: req.queryConfig.fields,
      filters: {
        id: req.params.id
      }
    },
    { throwIfKeyNotFound: true }
  )

  res.status(200).json({
    stock_location: stockLocation
  })
}

/**
 * @oas [delete] /vendor/stock-locations/{id}
 * operationId: "VendorDeleteStockLocationById"
 * summary: "Delete stock location"
 * description: "Deletes stock location by id for the authenticated vendor."
 * x-authenticated: true
 * parameters:
 *   - in: path
 *     name: id
 *     required: true
 *     description: The ID of the stock location.
 *     schema:
 *       type: string
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               description: The ID of the deleted resource
 *             object:
 *               type: string
 *               description: The type of the object that was deleted
 *             deleted:
 *               type: boolean
 *               description: Whether or not the items were deleted
 * tags:
 *   - Vendor Stock Locations
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  // await deleteStockLocationsWorkflow(req.scope).run({
  //   input: {
  //     ids: [req.params.id]
  //   }
  // })

  // const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  // await eventBus.emit({
  //   name: IntermediateEvents.STOCK_LOCATION_CHANGED,
  //   data: { id: req.params.id }
  // })

  // res.status(200).json({
  //   id: req.params.id,
  //   object: 'stock_location',
  //   deleted: true
  // })

  // for now user won't be able to delete stock location
  res.status(200).json({
    id: req.params.id,
    deleted: false,
    message: 'Stock location deletion is currently disabled'
  })
}
