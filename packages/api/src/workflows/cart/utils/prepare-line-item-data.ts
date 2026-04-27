import {
  BigNumberInput,
  CreateOrderAdjustmentDTO,
  CreateOrderLineItemTaxLineDTO,
  InventoryItemDTO,
  ProductVariantDTO,
  LineItemTaxLineDTO,
  LineItemAdjustmentDTO
} from '@medusajs/framework/types'
import { MathBN, PriceListType, isDefined } from '@medusajs/framework/utils'


interface PrepareItemLineItemInput {
  title?: string
  subtitle?: string
  thumbnail?: string
  quantity?: BigNumberInput

  product_id?: string
  product_title?: string
  product_description?: string
  product_subtitle?: string
  product_type?: string
  product_type_id?: string
  product_collection?: string
  product_handle?: string

  variant_id?: string
  variant_sku?: string
  variant_barcode?: string
  variant_title?: string
  variant_option_values?: Record<string, unknown>

  requires_shipping?: boolean

  is_discountable?: boolean
  is_tax_inclusive?: boolean

  raw_compare_at_unit_price?: BigNumberInput
  compare_at_unit_price?: BigNumberInput
  unit_price?: BigNumberInput

  tax_lines?: LineItemTaxLineDTO[]
  adjustments?: LineItemAdjustmentDTO[]
  cart_id?: string
  metadata?: Record<string, unknown> | null
  seller?: {
    id?: string
  }
}

export interface PrepareVariantLineItemInput extends ProductVariantDTO {
  inventory_items: { inventory: InventoryItemDTO }[]
  calculated_price: {
    calculated_price: {
      price_list_type: string
    }
    is_calculated_price_tax_inclusive: boolean
    original_amount: BigNumberInput
    calculated_amount: BigNumberInput
  }
}

export interface PrepareLineItemDataInput {
  item?: PrepareItemLineItemInput
  isCustomPrice?: boolean
  variant?: PrepareVariantLineItemInput
  taxLines?: CreateOrderLineItemTaxLineDTO[]
  adjustments?: CreateOrderAdjustmentDTO[]
  cartId?: string
  unitPrice?: BigNumberInput
  isTaxInclusive: boolean
}


export interface Input {
  // item?: CartLineItemDTO
  item?: PrepareItemLineItemInput // changed for link
  quantity?: BigNumberInput | null
  metadata?: Record<string, unknown> | null
  unitPrice?: BigNumberInput
  compareAtUnitPrice?: BigNumberInput | null
  isTaxInclusive?: boolean
  variant: ProductVariantDTO & {
    inventory_items: { inventory: InventoryItemDTO }[]
    calculated_price: {
      calculated_price: {
        price_list_type: string
      }
      original_amount: BigNumberInput
      calculated_amount: BigNumberInput
    }
  }
  taxLines?: CreateOrderLineItemTaxLineDTO[]
  adjustments?: CreateOrderAdjustmentDTO[]
  cartId?: string
  seller_id?: string
  location_id?: string
  isCustomPrice?: boolean
}

export function prepareLineItemData(data: Input) {
  const {
    item,
    variant,
    unitPrice,
    isTaxInclusive,
    quantity,
    cartId,
    taxLines,
    adjustments,
    seller_id,
    location_id
  } = data
  
  // Debug logging to see what's coming in
  
  if (variant && !variant.product) {
    throw new Error('Variant does not have a product')
  }
  
  let compareAtUnitPrice = data.compareAtUnitPrice
  
  const isSalePrice =
  variant?.calculated_price?.calculated_price?.price_list_type ===
  PriceListType.SALE


  if (
    !isDefined(compareAtUnitPrice) &&
    isSalePrice &&
    variant &&
    variant.calculated_price &&
    variant.calculated_price.calculated_price?.price_list_type ===
    PriceListType.SALE &&
    !MathBN.eq(
      variant.calculated_price.original_amount,
      variant.calculated_price.calculated_amount
    )
  ) {
    compareAtUnitPrice = variant.calculated_price.original_amount
  }
  
  // Debug output logging
  // Note: If any of the items require shipping, we enable fulfillment
  // unless explicitly set to not require shipping by the item in the request
  const inventoryItems = variant?.inventory_items || []
  const someInventoryRequiresShipping = inventoryItems.length
    ? inventoryItems.some(
        (inventoryItem) => !!inventoryItem.inventory.requires_shipping
      )
    : true

  const requiresShipping = isDefined(item?.requires_shipping)
    ? item.requires_shipping
    : someInventoryRequiresShipping

  // Set up a default title if missing to prevent validation errors
  // let defaultTitle = "Product Item"
  // if (item?.title) {
  //   defaultTitle = item.title
  // } else if (variant?.title) {
  //   defaultTitle = variant.title
  // } else if (variant?.product?.title) {
  //   defaultTitle = variant.product.title
  // }

  // Debug logging for price values if needed

  // const lineItem: any = {
  //   quantity,
  //   title: variant.title ?? item?.title,
  //   subtitle: variant.product.title ?? item?.subtitle,
  //   thumbnail: variant.product.thumbnail ?? item?.thumbnail,
  //
  //   product_id: variant.product.id ?? item?.product_id,
  //   product_title: variant.product.title ?? item?.product_title,
  //   product_description:
  //     variant.product.description ?? item?.product_description,
  //   product_subtitle: variant.product.subtitle ?? item?.product_subtitle,
  //   product_type: variant.product.type?.value ?? item?.product_type ?? null,
  //   product_type_id: variant.product.type?.id ?? item?.product_type_id ?? null,
  //   product_collection:
  //     variant.product.collection?.title ?? item?.product_collection ?? null,
  //   product_handle: variant.product.handle ?? item?.product_handle,
  //
  //   variant_id: variant.id,
  //   variant_sku: variant.sku ?? item?.variant_sku,
  //   variant_barcode: variant.barcode ?? item?.variant_barcode,
  //   variant_title: variant.title ?? item?.variant_title,
  //   variant_option_values: item?.variant_option_values,
  //
  //   is_discountable: variant.product.discountable ?? item?.is_discountable,
  //   requires_shipping: requiresShipping,
  //
  //   unit_price: unitPrice,
  //   compare_at_unit_price: compareAtUnitPrice,
  //   is_tax_inclusive: !!isTaxInclusive,
  //
  //   metadata
  // }

  // Extract seller_id from metadata if it exists and create a clean metadata object without seller_id
  const itemMetadata = item?.metadata || {}
  const cleanMetadata = { ...itemMetadata }
  const sellerId = cleanMetadata?.seller_id ?? seller_id ?? item?.seller?.id ?? null
  
  // Remove seller_id from metadata
  if (cleanMetadata.seller_id) {
    delete cleanMetadata.seller_id
  }

  // Extract and add product_configuration to metadata
  const productConfig = (variant as any)?.product?.product_configuration
  
  // Debug logging
  
  if (productConfig) {
    // Calculate returnable_days_message
    let returnableDaysMessage = ''
    if (productConfig.returnable_days !== undefined && productConfig.returnable_days !== null) {
      const days = parseInt(String(productConfig.returnable_days))
      if (days === 0) {
        returnableDaysMessage = 'Non-returnable'
      } else {
        returnableDaysMessage = `${days} days returnable.`
      }
    }

    // Add product configuration fields to metadata
    cleanMetadata.returnable_days = productConfig.returnable_days ?? ''
    cleanMetadata.is_returnable = productConfig.is_returnable ?? false
    cleanMetadata.is_exchangeable = productConfig.is_exchangeable ?? false
    cleanMetadata.is_try_and_buy = productConfig.is_try_and_buy ?? false
    cleanMetadata.returnable_days_message = returnableDaysMessage
  } else {
    // Add default values even if no product configuration exists
    cleanMetadata.returnable_days = ''
    cleanMetadata.is_returnable = false
    cleanMetadata.is_exchangeable = false
    cleanMetadata.is_try_and_buy = false
    cleanMetadata.returnable_days_message = ''
  }

  // const lineItem: any = {
  //   quantity,
  //   title: variant.title ?? item?.title,
  //   subtitle: variant.product.title ?? item?.subtitle,

  const lineItem: any = {
    quantity: quantity ?? item?.quantity ?? 1,
    // title: defaultTitle, // Always provide a default title
    title: variant?.product?.title ?? item?.title, // changed for link
    subtitle: item?.subtitle ?? variant?.product?.title,
    thumbnail: item?.thumbnail ?? variant?.product?.thumbnail,

    product_id: variant?.product?.id ?? item?.product_id,
    product_title: variant?.product?.title ?? item?.product_title,
    product_description:
      variant?.product?.description ?? item?.product_description,
    product_subtitle: variant?.product?.subtitle ?? item?.product_subtitle,
    product_type: variant?.product?.type?.value ?? item?.product_type ?? null,
    product_type_id: variant?.product?.type?.id ?? item?.product_type_id ?? null,
    product_collection:
      variant?.product?.collection?.title ?? item?.product_collection ?? null,
    product_handle: variant?.product?.handle ?? item?.product_handle,

    variant_id: variant?.id,
    variant_sku: variant?.sku ?? item?.variant_sku,
    variant_barcode: variant?.barcode ?? item?.variant_barcode,
    variant_title: variant?.title ?? item?.variant_title,
    variant_option_values: item?.variant_option_values,

    is_discountable: variant?.product?.discountable ?? item?.is_discountable,
    requires_shipping: requiresShipping,

    unit_price: unitPrice,
    compare_at_unit_price: compareAtUnitPrice,
    is_tax_inclusive: !!isTaxInclusive,

    seller_id: sellerId,
    location_id,

    metadata: cleanMetadata
  }

  if (taxLines) {
    lineItem.tax_lines = prepareTaxLinesData(taxLines)
  }

  if (adjustments) {
    lineItem.adjustments = prepareAdjustmentsData(adjustments)
  }

  if (cartId) {
    lineItem.cart_id = cartId
  }

  return lineItem
}

export function prepareAdjustmentsData(data: CreateOrderAdjustmentDTO[]) {
  return data.map((d) => ({
    code: d.code,
    amount: d.amount,
    description: d.description,
    promotion_id: d.promotion_id,
    provider_id: d.promotion_id
  }))
}

export function prepareTaxLinesData(data: CreateOrderLineItemTaxLineDTO[]) {
  return data.map((d) => ({
    description: d.description,
    tax_rate_id: d.tax_rate_id,
    code: d.code,
    rate: d.rate,
    provider_id: d.provider_id
  }))
}
