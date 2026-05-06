import { container } from "@medusajs/framework"
import { RedisKey } from "../../../shared/utils/redisKey"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import CustomCacheModuleService from "../../../modules/cache/service"
import stockLocationSellerLink from "@mercurjs/core/links/stock-location-seller-link"

// Function accepts any object and sanitizes to only allowed fields
export const upsertStockLocationCache = async (params: Record<string, any>) => {
  // Define allowed fields for sanitization
  const allowedFields = [
    'seller_id', 'stock_location_id', 'name',
    'address_type', 'partner_wh_code', 'lead_time', 'managed_by',
    'location_type', 'latitude', 'longitude', 'partner_id', 'return_location_id',
    'extension_status', 'servisibility_status', 'start_time', 'end_time', 'is_delay', 'delay_value', 'delay_message',
    'gst_number', 'fssai_number', 'pan_number',
    // 'created_by', 'updated_by',created_by
    //'stock_location_contact_id', 'stock_location_address_id', 'stock_location_extension_id', 'stock_location_section_id'
    'address_1', 'address_2', 'city', 'country_code', 'phone', 'province', 'postal_code', 'company',
    'first_name', 'last_name', 'email',
  ] as const
  // Sanitize input - only keep allowed fields
  const sanitized = allowedFields.reduce((acc, field) => {
    if (params[field] !== undefined) {
      acc[field] = params[field]
    } else {
      // console.log(`Field ${field} is undefined`)
    }
    return acc
  }, {} as Record<string, any>)
  

  if(!sanitized.seller_id || !sanitized.partner_wh_code) {
    // console.error("seller_id or partner_wh_code is undefined")
  }
  const key = `${RedisKey.STOCK_LOCATION_CACHE}:${sanitized.seller_id}:${sanitized.partner_wh_code}`

  try {
    const cacheService = container.resolve<CustomCacheModuleService>(Modules.CACHE)

    // Cache data - only use sanitized fields
    const cacheData = {
      seller_id: sanitized.seller_id,
      stock_location_id: sanitized.stock_location_id,
      name: sanitized.name,

      // stock_location_section_id: sanitized.stock_location_section_id,
      address_type: sanitized.address_type,
      partner_wh_code: sanitized.partner_wh_code,
      lead_time: sanitized.lead_time,
      managed_by: sanitized.managed_by,

      // stock_location_extension_id: sanitized.stock_location_extension_id,
      location_type: sanitized.location_type,
      latitude: sanitized.latitude,
      longitude: sanitized.longitude,
      partner_id: sanitized.partner_id,
      return_location_id: sanitized.return_location_id,
      extension_status: sanitized.extension_status,
      servisibility_status: sanitized.servisibility_status,
      start_time: sanitized.start_time,
      end_time: sanitized.end_time,
      is_delay: sanitized.is_delay,
      delay_value: sanitized.delay_value ?? '',
      delay_message: sanitized.delay_message ?? '',
      // created_by: sanitized.created_by,
      // updated_by: sanitized.updated_by,

      // stock_location_contact_id: sanitized.stock_location_contact_id,
      first_name: sanitized.first_name,
      last_name: sanitized.last_name,
      email: sanitized.email,

      // stock_location_address_id: sanitized.stock_location_address_id,
      address_1: sanitized.address_1,
      address_2: sanitized.address_2 ?? '',
      city: sanitized.city,
      country_code: sanitized.country_code,
      phone: sanitized.phone,
      province: sanitized.province,
      postal_code: sanitized.postal_code,
      company: sanitized.company ?? '',
      gst_number: sanitized.gst_number,
      fssai_number: sanitized.fssai_number,
      pan_number: sanitized.pan_number,
    }
    // console.log('cacheData>>>>>>>>>>>>>>>>>>', JSON.stringify(cacheData, null, 2))

    await cacheService.setPermanent(key, cacheData)

    // Seller–partner id-list cache (`seller_partner_stock_location_ids:*`) is separate from
    // warehouse `stock_location_cache`; refresh it at call sites when DB state for listings changes.

    // console.log(`Successfully cached stock location data for key: ${key}`)

  } catch (error) {
    console.error("Failed to upsert stock location cache:", error)
    // throw error
  }
}

export const validateIfSellerPartnerWhCodeAlreadyExists = async (seller_id: string, partner_wh_code: string) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: sellerLocations } = await query.graph({
    entity: stockLocationSellerLink.entryPoint,
    fields: ['seller_id', 'stock_location_id'],
    filters: {
      seller_id: seller_id,
    }
  })

  // console.log('>>>>>>>>>>>>>>>>>>>>>sellerLocations', sellerLocations)

  if (sellerLocations.length > 0) {
    const { data: sellerLocationMappings } = await query.graph({
      entity: "stock_location_section",
      fields: ['stock_location_id', 'partner_wh_code'],
      filters: {
        // seller_id: additional_data?.seller_id,
        stock_location_id: sellerLocations.map((location) => location.stock_location_id),
        partner_wh_code: partner_wh_code
      }
    })

    if (sellerLocationMappings.length > 0 && sellerLocationMappings[0].partner_wh_code === partner_wh_code) {
      // console.log('Stock location already exists', sellerLocationMappings)
      return true;

    }

  }
  return false
}

export const validateIfSellerPartnerWhCodeAlreadyExistsWhileUpdate = async (seller_id: string, partner_wh_code: string, previousSectionPartnerWhCode : string) => {

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: sellerLocations } = await query.graph({
    entity: stockLocationSellerLink.entryPoint,
    fields: ['seller_id', 'stock_location_id'],
    filters: {
      seller_id: seller_id,
    }
  })

  // console.log('>>>>>>>>>>>>>>>>>>>>>sellerLocations', sellerLocations)

  if (sellerLocations.length > 0) {
    const { data: sellerLocationMappings } = await query.graph({
      entity: "stock_location_section",
      fields: ['stock_location_id', 'partner_wh_code'],
      filters: {
        // seller_id: additional_data?.seller_id,
        stock_location_id: sellerLocations.map((location) => location.stock_location_id),
        partner_wh_code: partner_wh_code
      }
    })

    if (sellerLocationMappings.length > 0 
      && sellerLocationMappings[0].partner_wh_code === partner_wh_code
      //if during edit wh code is same as old wh code allow to Update it 
      && sellerLocationMappings[0].partner_wh_code !== previousSectionPartnerWhCode) {
      // console.log('Stock location already exists', sellerLocationMappings)
      return true;

      // return res.status(400).json({
      //   message: 'Stock location already exists'
      // })
    }

  }
  return false
}