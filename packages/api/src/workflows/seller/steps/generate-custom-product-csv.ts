import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { generateEntityId } from '@medusajs/framework/utils'
import { Readable, PassThrough } from 'stream'
import { batchUploadToS3Stream } from '../../../shared/utils/common'

interface ProductExportData {
    products: any[]
    seller: any
    attributeValues: any[]
    productConfigurations: any[]
}

interface CSVRow {
    [key: string]: string | number | boolean | null
}

export const generateCustomProductCsvStep = createStep(
    'generate-custom-product-csv',
    async (data: ProductExportData) => {
        const { products, seller, attributeValues, productConfigurations } = data

        // Memory optimization: Process in batches to avoid loading everything at once
        const BATCH_SIZE = 100 // Process 100 products at a time

        // Create attribute lookup maps
        const attributesByProduct = new Map()
        attributeValues.forEach(attr => {
            if (!attributesByProduct.has(attr.product_id)) {
                attributesByProduct.set(attr.product_id, [])
            }
            attributesByProduct.get(attr.product_id).push(attr.attribute_value)
        })

        // Create configuration lookup map
        const configurationsByProduct = new Map()
        productConfigurations.forEach(config => {
            if (!configurationsByProduct.has(config.product_id)) {
                configurationsByProduct.set(config.product_id, [])
            }
            configurationsByProduct.get(config.product_id).push(config.product_configuration)
        })

        // First pass: collect all attribute and measurement names for headers
        const allAttributeNames = new Set<string>()
        const allMeasurementNames = new Set<string>()

        products.forEach(product => {
            const productAttributes = attributesByProduct.get(product.id) || []

            // Collect attribute names
            productAttributes.forEach(attr => {
                const name = attr.attribute?.name || attr.attribute?.handle
                if (name) allAttributeNames.add(name)
            })

            // Collect measurement names from variants
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    const metadata = variant.metadata || {}
                    const measurements = metadata.measurements || []
                    measurements.forEach((measurement: any) => {
                        if (measurement.name && measurement.value && measurement.value !== 'NaN') {
                            let columnName = measurement.name
                            if (measurement.type === 'Body Measurement') {
                                columnName = `${measurement.name} (Body Measurement)`
                            } else if (measurement.type === 'Garment Measurement' && measurement.unit === 'Inches') {
                                columnName = `${measurement.name} (Inches)`
                            }
                            allMeasurementNames.add(columnName)
                        }
                    })
                })
            }
        })

        const attributeColumns = Array.from(allAttributeNames)
        const measurementColumns = Array.from(allMeasurementNames)

        // Create CSV header array
        const fixedHeadersBeforeAttributes = [
            'Product Id',
            'Variant Id',
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
            'Country Of Origin',
            'HSN',
            'MRP',
        ]

        const fixedHeadersAfterAttributes = [
            'Is Returnable',
            'Is Exchangeable',
            'Is Try And Buy',
            'Returnable Days',
            'Front Image',
            'Back Image',
            'Side Image',
            'Detail Angle',
            'Look Shot Image',
            'Lifestyle Image',
            'Product Status',
        ]

        const headerArray = [
            ...fixedHeadersBeforeAttributes,
            ...attributeColumns,
            ...measurementColumns,
            ...fixedHeadersAfterAttributes
        ]

        // Create a generator function that yields CSV rows with batch processing
        async function* generateCSVRows() {
            // Yield header row
            yield headerArray.map(escapeCSVField).join(',') + '\n'

            // Process products in batches
            for (let i = 0; i < products.length; i += BATCH_SIZE) {
                const batch = products.slice(i, i + BATCH_SIZE)

                // Yield data rows for this batch
                for (const product of batch) {
                    const productAttributes = attributesByProduct.get(product.id) || []
                    const productConfigs = configurationsByProduct.get(product.id) || []

                    if (product.variants && product.variants.length > 0) {
                        for (const variant of product.variants) {
                            const row = createProductVariantRow(product, variant, seller, productAttributes, productConfigs)
                            // Convert row object to array matching header order
                            const rowArray = headerArray.map(header => row[header] ?? '')
                            yield rowArray.map(escapeCSVField).join(',') + '\n'
                        }
                    } else {
                        const row = createProductRow(product, seller, productAttributes, productConfigs)
                        // Convert row object to array matching header order
                        const rowArray = headerArray.map(header => row[header] ?? '')
                        yield rowArray.map(escapeCSVField).join(',') + '\n'
                    }
                }

                // Allow garbage collection between batches
                if (i + BATCH_SIZE < products.length) {
                    await new Promise(resolve => setImmediate(resolve))
                }
            }
        }

        // Create a PassThrough stream for S3 upload
        const passThrough = new PassThrough()

        // Generate file name with subdirectory path
        const fileName = `export/products/products-export-${seller?.handle || seller?.id || 'filtered'}-${Date.now()}-${new Date().toISOString().split('T')[0]}-${generateEntityId()}.csv`

        // Validate filename pattern
        if (!fileName.startsWith('export/products/')) {
            throw new Error(`Invalid product export filename: must start with 'export/products/' but got '${fileName}'`)
        }

        // Start streaming upload to S3 (non-blocking)
        const uploadPromise = batchUploadToS3Stream([{
            filename: fileName,
            stream: passThrough,
            mimeType: 'text/csv'
        }])

        // Pipe the CSV stream to the PassThrough stream
        const csvStream = Readable.from(generateCSVRows())
        csvStream.pipe(passThrough)

        // Wait for upload to complete
        await uploadPromise

        // Construct the file URL
        if (!process.env.S3_FILE_URL) {
            throw new Error('S3_FILE_URL environment variable is not configured. Cannot construct file URL for export.')
        }

        const baseUrl = process.env.S3_FILE_URL.endsWith('/')
            ? process.env.S3_FILE_URL.slice(0, -1)
            : process.env.S3_FILE_URL
        const fileUrl = `${baseUrl}/${fileName}`

        return new StepResponse({
            id: fileName,
            url: fileUrl,
            filename: fileName,
            mimeType: 'text/csv'
        })
    }
)

function createProductRow(product: any, seller: any, attributes: any[], configurations: any[]): CSVRow {

    // Extract Color and Size from product options
    const colorOption = product.options?.find(
        (opt: any) => opt.title?.toLowerCase() === 'color' || opt.title?.toLowerCase() === 'colour'
    )
    // const sizeOption = product.options?.find(
    //     (opt: any) => opt.title?.toLowerCase() === 'size'
    // )

    const colorValue = colorOption?.values?.[0]?.value || ''
    // const sizeValue = sizeOption?.values?.[0]?.value || ''

    const imagePrefix = process.env.S3_FILE_URL || ''

    const images = product.images || []

    const getImageUrl = (rank) => {
        const image = images.find(img => img.rank === rank)
        return image ? `${imagePrefix}/${image.url}` : ''
    }

    const frontImage = getImageUrl(0)
    const backImage = getImageUrl(1)
    const sideImage = getImageUrl(2)
    const detailAngle = getImageUrl(3)
    const lookShot = getImageUrl(4)
    const lifestyle = getImageUrl(5)

    // Combine all attributes into a single field
    // const allAttributes = attributes.map(attr => {
    //     const name = attr.attribute?.name || attr.attribute?.handle || 'Unknown'
    //     return `${name}: ${attr.value || ''}`
    // }).join('; ')


    const config = configurations?.[0] || {}

    const formatBoolean = (val: boolean | undefined | null) => {
        if (val === true) return 'TRUE'
        if (val === false) return 'FALSE'
        return ''
    }

    const baseRow = {
        // Fixed columns in exact order as specified in fixedHeaders
        'Product Id': product.id || '',
        'Variant Id': '', // Empty for base row, populated in createProductVariantRow
        'Product Brand': product.brand?.name || '',
        'Product Handle': product.handle || '',
        'Product Title': product.title || '',
        'Product Subtitle': product.subtitle || '',
        'Product Description': product.description || '',
        'Article Type': product.categories?.map(cat => cat.name).join(', ') || '',
        'Seller': seller?.name || '',
        'Color': colorValue,
        'Size': '',
        'SKU Code': '', // Will be filled in variant rows
        'Country Of Origin': product.origin_country || '',
        'HSN': product.hs_code || '',
        'MRP': '', // Will be filled in variant rows
        // 'Attributes': allAttributes,
        'Is Returnable': formatBoolean(config.is_returnable),
        'Is Exchangeable': formatBoolean(config.is_exchangeable),
        'Is Try And Buy': formatBoolean(config.is_try_and_buy),
        'Returnable Days': config.returnable_days as number ?? '',
        'Front Image': frontImage,
        'Back Image': backImage,
        'Side Image': sideImage,
        'Detail Angle': detailAngle,
        'Look Shot Image': lookShot,
        'Lifestyle Image': lifestyle,

        // Measurement fields are now handled dynamically

        'Product Status': product.status || ''
    }


    // Add separate column for each attribute
    attributes.forEach(attr => {
        const name = attr.attribute?.name || attr.attribute?.handle || 'Unknown'
        baseRow[name] = attr.value || ''
    })
    return baseRow
}

function createProductVariantRow(product: any, variant: any, seller: any, attributes: any[], configurations: any[]): CSVRow {
    const baseRow = createProductRow(product, seller, attributes, configurations)

    let variantSizeValue = ''
    if (variant.options && product.options) {
        const sizeProductOption = product.options.find(
            (opt: any) => opt.title?.toLowerCase() === 'size'
        )
        const sizeOptionValue = variant.options.find(
            (vo: any) => vo.option_id === sizeProductOption?.id
        )
        variantSizeValue = sizeOptionValue?.value || ''
    }

    // Extract MRP from variant prices (assuming MRP is the highest price or marked as MRP)
    const mrpPrice = variant.prices?.find(price =>
        price.price_rules?.some(rule => rule.attribute === 'mrp') ||
        price.currency_code === 'INR'
    )
    const mrp = mrpPrice ? mrpPrice.amount : (variant.prices?.[0]?.amount || '')

    // Extract variant metadata for size measurements
    const metadata = variant.metadata || {}


    // Parse measurements from the new metadata structure
    const measurements = metadata.measurements || []
    const measurementMap: { [key: string]: string } = {}

    // Create a map of measurement names to their values using the same naming logic
    measurements.forEach((measurement: any) => {
        if (measurement.name && measurement.value && measurement.value !== 'NaN') {
            // Create column name with appropriate suffix based on measurement type
            let columnName = measurement.name
            if (measurement.type === 'Body Measurement') {
                columnName = `${measurement.name} (Size Chart)`
            } else if (measurement.type === 'Garment Measurement' && measurement.unit === 'Inches') {
                columnName = `${measurement.name} (Size Chart)`
            } else if (measurement.unit && measurement.unit !== 'Inches') {
                columnName = `${measurement.name} (${measurement.unit}) (Size Chart)`
            } else {
                columnName = `${measurement.name} (Size Chart)`
            }
            // Brand Size and other measurements without specific type/unit keep their original name
            measurementMap[columnName] = measurement.value
        }
    })

    // Create dynamic measurement columns object
    const measurementColumns: { [key: string]: string } = {}
    Object.keys(measurementMap).forEach(columnName => {
        measurementColumns[columnName] = measurementMap[columnName]
    })

    // Override variant-specific fields
    return {
        ...baseRow,
        'Variant Id': variant.id || '',
        Size: variantSizeValue,
        'SKU Code': variant.sku || '',
        'MRP': mrp,

        // Size chart measurements mapped to CSV columns
        // 'Brand Size': metadata.brand_size || metadata.brandSize || '',

        // Add all dynamic measurement columns
        ...measurementColumns
    }
}

function escapeCSVField(field: string | number | boolean | null | undefined): string {
    // Convert field to string first
    const fieldStr = field === null || field === undefined ? '' : String(field)

    // If field contains comma, newline, or double quote, wrap in quotes and escape internal quotes
    if (fieldStr.includes(',') || fieldStr.includes('\n') || fieldStr.includes('\r') || fieldStr.includes('"')) {
        return `"${fieldStr.replace(/"/g, '""')}"`
    }
    return fieldStr
}
