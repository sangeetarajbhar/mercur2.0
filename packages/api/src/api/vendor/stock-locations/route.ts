import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createStockLocationsWorkflow } from '@medusajs/medusa/core-flows'



import stockLocationSellerLink from '@mercurjs/core-plugin/links/stock-location-seller-link'
import { fetchSellerByAuthActorId } from '../../../shared/infra/http/utils'
import { UpsertStockLocationAddressType, VendorCreateStockLocationType } from './validators'
import { assignStockLocationToStockLocationExtension } from "../../../workflows/stock-location-extension/workflows";
import { assignStockLocationToStockLocationSection } from "../../../workflows/stock-location-section/workflows";
import { assignStockLocationSectionToStockLocationDocument } from "../../../workflows/stock-location-document/workflows";
import { DocumentType } from "../../../modules/stock-location-extension/types/common";
import { assignStockLocationSectionToStockLocationContact } from "../../../workflows/stock-location-contact/workflows";
import { uploadToS3WithPath } from "../../../shared/utils";
import { upsertStockLocationCache, validateIfSellerPartnerWhCodeAlreadyExists } from "../../../api/vendor/stock-locations/helpers";
import { addDefaultZoneAndOptions } from '../../../workflows/stock-location/workflows/add-default-zone';
import CacheModuleService from '../../../modules/cache/service'
import { refreshSellerPartnerStockLocationIdsCachesForSeller } from '../../../shared/utils/cache/seller-partner-stock-location-ids-cache'
import { MercurModules } from '@mercurjs/types'
const SELLER_MODULE = MercurModules.SELLER
import { IntermediateEvents } from '../../../types/event'


/**
 * @oas [post] /vendor/stock-locations
 * operationId: "VendorCreateStockLocation"
 * summary: "Create a Stock Location"
 * description: "Creates a Stock Location."
 * x-authenticated: true
 * parameters:
 *   - in: query
 *     name: fields
 *     description: The comma-separated fields to include in the response
 *     schema:
 *       type: string
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/VendorCreateStockLocation"
 * responses:
 *   "201":
 *     description: Created
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
  req: AuthenticatedMedusaRequest<VendorCreateStockLocationType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const link = req.scope.resolve("link")
  const seller_id =  req.auth_context.actor_id;

  const seller = await fetchSellerByAuthActorId(
    seller_id as string,
    req.scope
  )
  const { additional_data, ...validatedBody } = req.validatedBody

  // console.log("additional_data >>>>>>>>>>>>>>>>>>>>>", seller.id, additional_data?.partner_wh_code)
  if (seller.id && additional_data?.partner_wh_code as string) {
    // console.log("actually before")

    const isExists = await validateIfSellerPartnerWhCodeAlreadyExists(seller.id as string, additional_data?.partner_wh_code as string)
    if (isExists) {
      return res.status(400).json({
        message: 'warehouse code already exists for this seller'
      })
    }

  }

  const { result } = await createStockLocationsWorkflow(req.scope).run({
    input: { locations: [validatedBody] }
  })

  await remoteLink.create({
    [SELLER_MODULE]: {
      seller_id: seller.id
    },
    [Modules.STOCK_LOCATION]: {
      stock_location_id: result[0].id
    }
  })

  const stock_location_id: string = result[0].id
  const address: UpsertStockLocationAddressType | undefined = req.validatedBody.address

  if (additional_data && stock_location_id) {
    const stockLocationExtension = await assignStockLocationToStockLocationExtension.run({
      container: req.scope,
      input: {
        stock_location_id: stock_location_id,
        location_type: additional_data.location_type,
        address_type: additional_data.address_type,
        latitude: additional_data.latitude,
        longitude: additional_data.longitude,
        partner_id: additional_data.partner_id,
        return_location_id: additional_data.return_location_id === "self" ? stock_location_id : additional_data.return_location_id,
        status: additional_data.status,
        servisibility_status: additional_data.servisibility_status,
        start_time: additional_data.start_time,
        end_time: additional_data.end_time,
        created_by: seller.id,
        updated_by: seller.id,
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
              console.error(`Failed to upload ${DocumentType[doc.type]} document to S3:`, error)
            }
          }
        }

      // Link Manual Provider with stock location Module
      const { data: provider } = await query.graph({
        entity: "fulfillment_provider",
        fields: ["*"],
        // filters: { name: "manual_manual" },
      })

      if(provider && provider.length > 0){
          await link.create({
           [Modules.STOCK_LOCATION]: { stock_location_id: stock_location_id },
           [Modules.FULFILLMENT]: { fulfillment_provider_id: provider[0].id  }
         })
      }

      const inputObj = {
          stock_location_id: stock_location_id,
          location_name: validatedBody.name,
          seller_id: seller.id,
      }

      //Assign Default Zone and Options to the Stock Location For Shipping and Pickup
      addDefaultZoneAndOptions(req.scope).run({
        input:{
          ...inputObj,
          set: {name: `Shipping`, type: "shipping"}
        }
      })

      addDefaultZoneAndOptions(req.scope).run({
        input:{
          ...inputObj,
          set: {name: `Pick-up`, type: "pickup"}
        }
      })

        await assignStockLocationSectionToStockLocationContact.run({
          container: req.scope,
          input: {
            stock_location_section_id: stockLocationSection.result?.id,
            first_name: additional_data.first_name,
            last_name: additional_data.last_name,
            email: additional_data.email,
            phone_number: address?.phone,
          }
        })

        if (Number(additional_data.address_type) === 3 && additional_data?.partner_wh_code) {

          try {


            const toCacheFields = {
              ...additional_data,
              seller_id: seller.id,
              stock_location_id: stock_location_id,
              name: validatedBody.name,
              ...validatedBody.address,
              extension_status: additional_data.status,
              return_location_id:
                additional_data.return_location_id === 'self'
                  ? stock_location_id
                  : additional_data.return_location_id,

            }

            await upsertStockLocationCache(toCacheFields)

            const cacheService =
              req.scope.resolve<CacheModuleService>(Modules.CACHE)
            await refreshSellerPartnerStockLocationIdsCachesForSeller(
              cacheService,
              seller.id
            )
          } catch (error) {
            console.error('Vendor - Error upserting stock location cache:', error)
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

  const {
    data: [stockLocation]
  } = await query.graph({
    entity: 'stock_location',
    fields: req.queryConfig.fields,
    filters: {
      id: result[0].id
    }
  })

  res.status(201).json({
    stock_location: stockLocation
  })
}

/**
 * @oas [get] /vendor/stock-locations
 * operationId: "VendorListStockLocations"
 * summary: "List Stock Locations"
 * description: "Retrieves a list of Stock Locations."
 * x-authenticated: true
 * parameters:
 *   - in: query
 *     name: fields
 *     description: The comma-separated fields to include in the response
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
 *             stock_locations:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/VendorStockLocation"
 * tags:
 *   - Vendor Stock Locations
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: sellerLocations, metadata } = await query.graph({
    entity: stockLocationSellerLink.entryPoint,
    fields: req.queryConfig.fields.map((field) => `stock_location.${field}`),
    filters: {
      ...req.filterableFields,
      deleted_at: {
        $eq: null
      }
    },
    pagination: req.queryConfig.pagination
  })

  // Transform the pdf_url field for each stock location
  const S3_BASE_URL = process.env.S3_FILE_URL
  const transformedLocations = sellerLocations.map((sellerLocation) => {
    const stockLocation = sellerLocation.stock_location

    if (
      stockLocation?.stock_location_section?.stock_location_documents &&
      Array.isArray(stockLocation.stock_location_section.stock_location_documents)
    ) {
      stockLocation.stock_location_section.stock_location_documents =
        stockLocation.stock_location_section.stock_location_documents.map((doc) => ({
          ...doc,
          pdf_url: doc.pdf_url
            ? `${S3_BASE_URL}/${doc.pdf_url.replace(/^\/+/, '')}`
            : doc.pdf_url,
        }))
    }

    return stockLocation
  })


  res.status(200).json({
    stock_locations: transformedLocations,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take
  })
}
