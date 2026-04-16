import { Modules, MedusaError } from "@medusajs/framework/utils"
import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { convertCsvToJson } from "../utils/csvtojson"
import { normalizeForImport } from "../helpers/normalize-for-import"
import { normalizeV1Products } from "../helpers/normalize-v1-import"
// import { processImageFromUrl, ResizedImage } from "../../../shared/utils/image-processor"

export const parseProductCsvStepId = "parse-product-csv"

/**
 * Default product fields - core product fields that map directly to Medusa product properties
 */
const DEFAULT_PRODUCT_FIELDS = new Set([
  'Product Brand',
  'Product Handle',
  'Product Title',
  'Product Subtitle',
  'Product Description',
  'Article Type',
  'Seller',
  'Color',
  'Size',
  'SKU Code',
  'MRP',
  'Product Status',
  'Front Image',
  'Back Image',
  'Side Image',
  'Detail Angle',
  'Look Shot Image',
  'Lifestyle Image'
])

/**
 * Default attribute fields - attributes with special handling
 */
const DEFAULT_ATTRIBUTE_FIELDS = new Set([
  'HSN',
  // 'Product Length',
  'Country Of Origin'
])

/**
 * Product configuration fields
 */
const PRODUCT_CONFIGURATION_FIELDS = new Set([
  'Is Returnable',
  'Is Exchangeable',
  'Is Try And Buy',
  'Returnable Days'
])

/**
 * Size chart fields - body and garment measurements
 */
const SIZE_CHART_FIELDS = new Set([
  'Brand Size',
  'Waist (Body Measurement)',
  'Front Length (Inches)',
  'Thigh (Inches)',
  'Hip (Body Measurement)',
  'Inseam Length',
  'Outseam Length'
])

/**
 * Helper function to categorize a column into its appropriate processing group
 */
function categorizeColumn(columnName: string): 'default_product' | 'default_attribute' | 'configuration' | 'size_chart' | 'remaining_attribute' {
  if (DEFAULT_PRODUCT_FIELDS.has(columnName)) return 'default_product'
  if (DEFAULT_ATTRIBUTE_FIELDS.has(columnName)) return 'default_attribute'
  if (PRODUCT_CONFIGURATION_FIELDS.has(columnName)) return 'configuration'
  
  // Check if column name contains "size chart" (case insensitive)
  if (columnName.toLowerCase().includes('size chart') || SIZE_CHART_FIELDS.has(columnName)) return 'size_chart'
  
  return 'remaining_attribute'
}

/**
 * Helper function to collect remaining attributes that should go to Product Metadata
 */
function collectRemainingAttributes(product: Record<string, unknown>): Record<string, unknown> {
  const remainingAttributes: Record<string, unknown> = {}
  
  // Get all keys that should go to Product Metadata (not in the predefined sets)
  const systemFields = new Set([
    'variant_option_1_name', 'variant_option_1_value',
    'variant_option_2_name', 'variant_option_2_value', 
    'variant_sku', 'variant_price_inr', 'prices',
    'product_category_1', 'product_sales_channels',
    'Product Configuration', 'Product Metadata', 'Variant Metadata',
    'Original Image URLs', 'Process Images',
    'Product Image 1 Url', 'Product Image 2 Url', 'Product Image 3 Url',
    'Product Image 4 Url', 'Product Image 5 Url', 'Product Image 6 Url',
    'product_hs_code', 'product_origin_country'
  ])
  
  Object.keys(product).forEach(key => {
    if (!systemFields.has(key) && categorizeColumn(key) === 'remaining_attribute') {
      remainingAttributes[key] = product[key]
    }
  })
  
  return remainingAttributes
}

/**
 * This step parses a CSV file holding products to import, returning the products as
 * objects that can be imported.
 *
 * @example
 * const data = parseProductCsvStep("products.csv")
 */
export const parseProductCsvStep = createStep(
  parseProductCsvStepId,
  async (fileContent: string, { container }: { container: any }) => {
    const regionService = container.resolve(Modules.REGION)
    const productService = container.resolve(Modules.PRODUCT)
    const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)
    const query = container.resolve("query")

    // retrieve store to get default_sales_channel_id
    const { data: stores } = await query.graph({
      entity: "store",
      fields: ["default_sales_channel_id","shipping_profile_id"],
      pagination: { take: 1, skip: 0 },
    })
    const defaultScId = stores?.[0]?.default_sales_channel_id

    const csvProducts = convertCsvToJson(fileContent)

    const [productTypes, productCollections, salesChannels, shippingProfiles] = await Promise.all([
      productService.listProductTypes({}, {}),
      productService.listProductCollections({}, {}),
      salesChannelService.listSalesChannels({}, {}),
      fulfillmentService.listShippingProfiles({}, {}),
    ])

    const v1Normalized = normalizeV1Products(csvProducts, {
      productTypes,
      productCollections,
      salesChannels,
      shippingProfiles,
    })



    // After resolving productService and before normalization
    const allCategories = await productService.listProductCategories({}, { select: ['id', 'name'] }) // fetch all categories

    // Build a map for quick lookup
    const categoryNameToId = {}
    allCategories.forEach(cat => {
      categoryNameToId[cat.name] = cat.id
    })

    // Map size/color to variant_option_X_name and value only if both are present
    v1Normalized.forEach((product: Record<string, unknown>, index: number) => {
      if (product.Size && product.Color) {
        product.variant_option_1_name = "Size"
        product.variant_option_1_value = product.Size
        product.variant_option_2_name = "Color"
        product.variant_option_2_value = product.Color
        product.variant_sku = product['SKU Code']
        // Remove original fields
        delete product.Size
        delete product.Color
        delete product['SKU Code']
      }

      const mrpValue = String(product.MRP || '').trim();
      if (!mrpValue) {
        throw new Error(`MRP is required for product "${product['Product Title'] || 'Unknown Product'}" at row ${index + 2}`);
      }
      
      const variantPriceInr = parseFloat(mrpValue);
      if (isNaN(variantPriceInr)) {
        throw new Error(`MRP must be a valid number for product "${product['Product Title'] || 'Unknown Product'}" at row ${index + 2}`);
      }
      
      if (variantPriceInr <= 0) {
        throw new Error(`MRP must be greater than 0 for product "${product['Product Title'] || 'Unknown Product'}" at row ${index + 2}`);
      }
      
      if (variantPriceInr === 0) {
        throw new Error(`MRP cannot be 0 for product "${product['Product Title'] || 'Unknown Product'}" at row ${index + 2}`);
      }
      
      product.variant_price_inr = variantPriceInr;
      product.prices = [
        {
          amount: variantPriceInr,
          currency_code: "inr", // adjust as needed
        },
      ];
      delete product.MRP;

      // Map category name to ID
      const categoryName = String(product['Article Type'] || '')
      if (categoryName && categoryNameToId[categoryName]) {
        product.product_category_1 = categoryNameToId[categoryName]
      }
      delete product['Article Type']

      // Extract and map product dimensions and other attributes

      // if (product['Product Length']) {
      //   product.product_length = parseFloat(String(product['Product Length'])) || null
      //   delete product['Product Length']
      // }

      // HS code for customs
      if (product['HSN']) {
        product.product_hs_code = String(product['HSN'])
        delete product['HSN']
      }

      // Country of origin
      if (product['Country Of Origin']) {
        product.product_origin_country = String(product['Country Of Origin'])
        delete product['Country Of Origin']
      }

      // Map default sales channel
      product['product_sales_channels'] = [{ id: defaultScId }]

      // Process body measurements
      interface Measurement {
        name: string;
        type: string;
        unit: string;
        value: string;
        maxValue: string;
        minValue: string;
        displayText: string;
      }

      const measurements: Measurement[] = []

      // Define measurement fields to process
      const measurementFields = [
        { csvField: 'Waist (Body Measurement)', name: 'Waist', type: 'Body Measurement', unit: 'Inches' },
        { csvField: 'Front Length (Inches)', name: 'Front Length', type: 'Garment Measurement', unit: 'Inches' },
        { csvField: 'Thigh (Inches)', name: 'Thigh', type: 'Body Measurement', unit: 'Inches' },
        { csvField: 'Hip (Body Measurement)', name: 'Hip', type: 'Body Measurement', unit: 'Inches' },
        { csvField: 'Inseam Length', name: 'Inseam Length', type: 'Garment Measurement', unit: 'Inches' },
        { csvField: 'Outseam Length', name: 'Outseam Length', type: 'Garment Measurement', unit: 'Inches' },
        { csvField: 'Brand Size', name: 'Brand Size', type: 'Garment Measurement', unit: 'Inches' },
        // Dress-specific measurements
        { csvField: 'Size - Chest/Bust (inches)', name: 'Chest/Bust Size', type: 'Garment Measurement', unit: 'Inches' },
        { csvField: 'Sleeve Length (inches)', name: 'Sleeve Length', type: 'Garment Measurement', unit: 'Inches' },
        { csvField: 'Across Shoulder (inches)', name: 'Across Shoulder', type: 'Garment Measurement', unit: 'Inches' },
        { csvField: 'Bust (Body Measurement) (inches)', name: 'Bust', type: 'Body Measurement', unit: 'Inches' },
        { csvField: 'Waist (Body Measurement) (inches)', name: 'Waist', type: 'Body Measurement', unit: 'Inches' },
        { csvField: 'Hip (Body Measurement) (inches)', name: 'Hip', type: 'Body Measurement', unit: 'Inches' },
        // Innerwear specific measurements
        { csvField: 'Size - Chest/Bust', name: 'Chest/Bust Size', type: 'Garment Measurement', unit: 'Inches' },
        { csvField: 'Across Shoulder', name: 'Accross Shoulder', type: 'Garment Measurement', unit: 'Inches' },
        // Set Product specific measurements
        { csvField: 'Hip (Body Measurement)', name: 'Hip', type: 'Body Measurement', unit: 'Inches' },
        { csvField: 'Bottom Length', name: 'Bottom Length', type: 'Garment Measurement', unit: 'Inches' },
        // Saree & Blouse specific measurements
        { csvField: 'Saree Length (Mtr)', name: 'Saree Length', type: 'Garment Measurement', unit: 'Meters' },
        { csvField: 'Blouse Length (Mtr)', name: 'Blouse Length', type: 'Garment Measurement', unit: 'Meters' },
        { csvField: 'Saree Width (Mtr)', name: 'Saree Width', type: 'Garment Measurement', unit: 'Meters' },
        // footwear specific measurements
        { csvField: 'UK', name: 'UK', type: 'footwear Measurement', unit: '' },
        { csvField: 'US', name: 'US', type: 'footwear Measurement', unit: '' },
        { csvField: 'EURO', name: 'EURO', type: 'footwear Measurement', unit: '' },
        { csvField: 'To Fit Foot Length in cm', name: 'Foot Length', type: 'footwear Measurement', unit: 'cm' },
      ]

      // Process each measurement field
      measurementFields.forEach(field => {
        const value = product[field.csvField]
        if (value && value !== '') {
          const stringValue = String(value).trim()
          
          // Check if value is numeric or alphanumeric
          const numericValue = parseFloat(stringValue)
          const isNumeric = !isNaN(numericValue) && isFinite(numericValue)
          
          if (isNumeric) {
            // Format numeric values with one decimal place
            const formattedValue = numericValue.toFixed(1)
            measurements.push({
              name: field.name,
              type: field.type,
              unit: field.unit,
              value: formattedValue,
              maxValue: formattedValue,
              minValue: formattedValue,
              displayText: `${formattedValue}${field.unit ? (
                field.unit === 'Meters' ? 'm' :
                field.unit === 'cm' ? 'cm' :
                'in'
              ) : ''}`
            })
          } else {
            // Handle alphanumeric values (e.g., "S", "M", "L", "XL", "28W", etc.)
            measurements.push({
              name: field.name,
              type: field.type,
              unit: field.unit,
              value: stringValue,
              maxValue: stringValue,
              minValue: stringValue,
              displayText: stringValue
            })
          }

          // Remove the original field to avoid duplication
          delete product[field.csvField]
        }
      })

      // Process any additional size chart fields that contain "size chart" in their name
      Object.keys(product).forEach(fieldName => {
        if (categorizeColumn(fieldName) === 'size_chart' && !measurementFields.some(f => f.csvField === fieldName)) {
          const value = product[fieldName]
          if (value && value !== '') {
            const stringValue = String(value).trim()
            
            // Check if value is numeric or alphanumeric
            const numericValue = parseFloat(stringValue)
            const isNumeric = !isNaN(numericValue) && isFinite(numericValue)
            
            // Extract measurement name by removing "(Size chart)" and similar patterns
            const cleanName = fieldName.replace(/\s*\(.*?size\s*chart.*?\)\s*/gi, '').trim()
            
            if (isNumeric) {
              // Format numeric values with one decimal place
              const formattedValue = numericValue.toFixed(1)
              measurements.push({
                name: cleanName || fieldName,
                type: 'Garment Measurement', // Default type for dynamic size chart fields
                unit: 'Inches', // Default unit
                value: formattedValue,
                maxValue: formattedValue,
                minValue: formattedValue,
                displayText: `${formattedValue}in`
              })
            } else {
              // Handle alphanumeric values (e.g., "S", "M", "L", "XL", "28W", etc.)
              measurements.push({
                name: cleanName || fieldName,
                type: 'Garment Measurement', // Default type for dynamic size chart fields
                unit: 'Inches', // Default unit (can be empty or adjusted for alphanumeric)
                value: stringValue,
                maxValue: stringValue,
                minValue: stringValue,
                displayText: stringValue
              })
            }

            // Remove the original field to avoid duplication
            delete product[fieldName]
          }
        }
      })

      product['Variant Metadata'] = {
        // number_of_items: product['Number of Items'],
        // style_id: product['Style ID'],
        // ean: product['EAN'],
        // gtin: product['GTIN'],
        // gender: product['Gender'],
        // fabric: product['Fabric'],
        // fabric_composition_in_percent: product['Fabric Composition in %'],
        // lining: product['Lining'],
        // knit_or_woven: product['Knit or Woven'],
        // fit_type: product['Fit Type'],
        // pant_leg_shape: product['Pant Leg Shape'],
        // waistband: product['Waistband'],
        // waist_rise: product['Waist Rise'],
        // closure_type: product['Closure Type'],
        // distressed: product['Distressed'],
        // fade: product['Fade'],
        // hemline: product['Hemline'],
        // number_of_pockets: product['Number of Pockets'],
        // occasion: product['Occasion'],
        // fashion_type: product['Fashion Type'],
        // season: product['Season'],
        // bottom_style: product['Bottom Style'],
        // pattern_type: product['Pattern Type'],
        // detailing_surface: product['Detailing Surface'],
        // wash_care: product['Wash Care'],
        // stretchable: product['Stretchable'],
        // Add measurements array to variant metadata
        measurements: measurements.length > 0 ? measurements : undefined
      }

      // Collect all remaining attributes that should go into Product Metadata
      const remainingAttributes = collectRemainingAttributes(product)
      
      // Clean up field names in metadata to remove carriage returns and invalid characters
      const cleanedMetadata: Record<string, unknown> = {}
      Object.entries(remainingAttributes).forEach(([key, value]) => {
        // Clean the key by removing carriage returns, newlines, and trimming whitespace
        const cleanedKey = key.trim().replace(/[\r\n]/g, '')
        
        // Only add valid, non-empty keys
        if (cleanedKey && cleanedKey.length > 0) {
          cleanedMetadata[cleanedKey] = value
        } else {
          console.warn(`Skipping invalid metadata key: "${key}"`)
        }
      })
      
      product['Product Metadata'] = cleanedMetadata

      // Clean up processed fields from the product object
      DEFAULT_ATTRIBUTE_FIELDS.forEach(field => {
        if (product[field] !== undefined) {
          delete product[field]
        }
      })
      
      // Clean up size chart fields that are now in measurements
      SIZE_CHART_FIELDS.forEach(field => {
        if (product[field] !== undefined) {
          delete product[field]
        }
      })
      
      // Also clean up any dynamically detected size chart fields
      Object.keys(product).forEach(field => {
        if (categorizeColumn(field) === 'size_chart' && product[field] !== undefined) {
          delete product[field]
        }
      })
      
      // Clean up remaining attribute fields that are now in metadata
      Object.keys(remainingAttributes).forEach(field => {
        delete product[field]
      })

      // Extract product configuration fields
      let isReturnable =
        product['Is Returnable'] === 'Yes' ||
        product['Is Returnable'] === 'TRUE' ||
        product['Is Returnable'] === true

      const isExchangeable =
        product['Is Exchangeable'] === 'Yes' ||
        product['Is Exchangeable'] === 'TRUE' ||
        product['Is Exchangeable'] === true

      const isTryAndBuy =
        product['Is Try And Buy'] === 'Yes' ||
        product['Is Try And Buy'] === 'TRUE' ||
        product['Is Try And Buy'] === true

      const returnableDays = product['Returnable Days']

      // Business rules:
      // 1. If returnable days is present, force is_returnable = true
      if (returnableDays && returnableDays !== '') {
        isReturnable = true
      }

      // 2. If is_returnable or is_exchangeable is false, reset returnable_days = 0
      // if (!isReturnable || !isExchangeable) {
      //   returnableDays = 0
      // }

      product['Product Configuration'] = {
        is_returnable: isReturnable,
        is_exchangeable: isExchangeable,
        is_try_and_buy: isTryAndBuy,
        returnable_days: parseInt(String(returnableDays)) || 0,
      }

      // Remove original fields
      delete product['Is Returnable']
      delete product['Is Exchangeable']
      delete product['Is Try And Buy']
      delete product['Returnable Days']

      // Store original image URLs in metadata for reference
      product['Original Image URLs'] = {
        front: product['Front Image'],
        back: product['Back Image'],
        side: product['Side Image'],
        detail: product['Detail Angle'],
        look_shot: product['Look Shot Image'],
        lifestyle: product['Lifestyle Image']
      }

      // Map the image fields to standard product image URLs
      // These will be replaced with resized versions in the next step
      product['Product Image 1 Url'] = product['Front Image']
      product['Product Image 2 Url'] = product['Back Image']
      product['Product Image 3 Url'] = product['Side Image']
      product['Product Image 4 Url'] = product['Detail Angle']
      product['Product Image 5 Url'] = product['Look Shot Image']
      product['Product Image 6 Url'] = product['Lifestyle Image']

      // Add a flag to indicate that images need processing
      // product['Process Images'] = true

      // const imageFields = [
      //   { key: "Front Image", label: "front" },
      //   { key: "Back Image", label: "back" },
      //   { key: "Side Image", label: "side" },
      //   { key: "Detail Angle", label: "detail_angle" },
      //   { key: "Look Shot Image", label: "look_shot" },
      //   { key: "Lifestyle Image", label: "lifestyle" },
      // ];

      // product.images = [];

      // imageFields.forEach(({ key, label }) => {
      //   if (product[key]) {
      //     product.images.push({
      //       url: product[key],
      //       metadata: { type: label }, // Optional: add type metadata
      //     });
      //     delete product[key]; // Clean up the original field
      //   }
      // });
    })

    function slugify(text: string): string {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumerics with -
        .replace(/^-+|-+$/g, "") // trim leading/trailing -
    }

    // We use the handle to group products and variants correctly.
    v1Normalized.forEach((product: any) => {
      if (!product["Product Handle"]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Product handle is required when importing products"
        )
      }
      product["Product Handle"] = slugify(product["Product Handle"])
    })

    const [allRegions, allTags] = await Promise.all([
      regionService.listRegions({}, { select: ["id", "name", "currency_code"] }),
      productService.listProductTags({}, { select: ["id", "value"] }),
    ])

    const normalizedData = normalizeForImport(v1Normalized, {
      regions: allRegions,
      tags: allTags,
    })

    return new StepResponse(normalizedData)
  }
)