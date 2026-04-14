import { LocationType } from '../../../modules/stock-location-extension/types/common'

import { container } from '@medusajs/framework'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { StepResponse, createStep } from '@medusajs/framework/workflows-sdk'
import { fetchZoneByPincode } from '../../../workflows/delivery-promise/steps/cart-promise/fetch-zone-by-pincode'
import { Knex } from 'knex'

/**
 * Input type for mapping cart items to location
 */
type MapCartItemsToLocation = {
  cart: any
}

/**
 * Output type for cart items to location mapping
 */
type MapCartItemsToLocationOutput = {
  cartLineItemWithInventoryLocationData: any
  allocationResult: AllocationResult
}

// Inventory data result
type Inventory = {
  variant_id: string
  inventory_item_id: string
  location_id: string
  stocked_quantity: string
  reserved_quantity: string
  created_at: Date
  location_type: any
}

// Define the type for allocated location objects
type AllocatedLocation = {
  variant_id: string
  inventory_item_id: string
  location_id: string
  location_type: string
  allocatedQuantity: number
  originalAvailable: number
  inventoryRecord: Inventory
}

interface AllocationResult {
  success: boolean;
  allocatedLocations: AllocatedLocation[];
  remainingQuantity: number;
}

interface LocationHierarchy {
  id: string;
  parent_location_id: string;
  child_location_id: string;
}

// Validate Cart Line Items
async function validateCartLineItem(cart: any) {
  const errors: any[] = []

  for (const item of cart.items) {
    const errorItem: any = { id: item.id, issues: [] }

    if (!item.quantity || !item.variant || !item.seller) {
      errorItem.issues.push(
        'Missing required fields (quantity or variant, or seller)'
      )
    }

    if (item.quantity && item.quantity <= 0) {
      errorItem.issues.push('Quantity must be greater than 0')
    }

    if (errorItem.issues.length > 0) {
      errors.push(errorItem)
    }
  }

  return { cart, errors }
}

async function groupCartLineItemByVariantAndSeller(cart: any) {
  const grouped = {}
  cart.items.forEach((item) => {
    const key = `${item.variant.id}-${item.seller.id}`
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key] = item
  })

  return grouped
}

async function getInventoryByVariantIdSellerId(
  variantId: string,
  sellerId: string,
  darkStoreWithChildrenStockLocation: string[]
) {
  // Get database connection through the container
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const formattedIds = darkStoreWithChildrenStockLocation
    .map(id => `'${id}'`)
    .join(', ');

  // Get inventory by Item variant and seller mapped to that inventory item variant
  const inventoryResult = await knex.raw(`
    SELECT 
      pv.id as variant_id,
      pvii.inventory_item_id,
      il.location_id,
      il.stocked_quantity,
      il.reserved_quantity,
      il.created_at,
      sle.location_type
    FROM  
      product_variant pv
    JOIN 
      product_variant_inventory_item pvii ON (pv.id = pvii.variant_id AND pvii.deleted_at IS NULL)
    JOIN
      inventory_level il ON (pvii.inventory_item_id = il.inventory_item_id AND il.deleted_at IS NULL)
    JOIN
      seller_seller_inventory_inventory_item ssii ON (pvii.inventory_item_id = ssii.inventory_item_id AND ssii.deleted_at IS NULL)
    JOIN
      stock_location_stock_location_extension slsle ON (il.location_id = slsle.stock_location_id AND slsle.deleted_at IS NULL)
    JOIN
      stock_location_extension sle ON (slsle.stock_location_extension_id = sle.id AND sle.deleted_at IS NULL)
    JOIN
      seller_seller_stock_location_stock_location sslsl ON (il.location_id = sslsl.stock_location_id AND sslsl.deleted_at IS NULL)
    WHERE
      pv.id = '${variantId}' AND ssii.seller_id = '${sellerId}' AND sslsl.seller_id = '${sellerId}' AND (il.stocked_quantity - il.reserved_quantity > 0)
        AND slsle.stock_location_id IN (${formattedIds}) AND sslsl.stock_location_id IN (${formattedIds})
  `)

  return inventoryResult.rows
}

async function getRequiredInventory(lineItemByVariantAndSeller: any, darkStoreWithChildrenStockLocation: string[]) {
  const inventoryPromises = Object.entries(lineItemByVariantAndSeller).map(
    async ([key]) => {
      const [variantId, sellerId] = key.split('-')
      const inventory: Inventory = await getInventoryByVariantIdSellerId(variantId, sellerId, darkStoreWithChildrenStockLocation)

      return { [key]: inventory }
    }
  )

  const results = await Promise.all(inventoryPromises)

  const combinedInventory = {}
  results.forEach((result) => {
    Object.assign(combinedInventory, result)
  })

  return combinedInventory
}

function getAvailableQuantity(item: Inventory) {
  return Number(item.stocked_quantity) - Number(item.reserved_quantity || 0)
}

function sortInventoryByPriority(
  inventoryList: Inventory[],
  userQuantity: number
) {
  if (!inventoryList.length) return []
  // Calculate available quantities
  const inventories = inventoryList.map((inv) => ({
    ...inv,
    available: getAvailableQuantity(inv)
  }))

  // Group by location type
  const darkStore = inventories.find(
    (inv) => inv.location_type === LocationType.DARK_STORE.toString()
  )
  const omniStore = inventories.find(
    (inv) => inv.location_type === LocationType.OMNI.toString()
  )

  // CASE 1: Both Dark & Omni exist
  if (darkStore && omniStore) {
    // If either has enough stock individually
    if (darkStore.available >= userQuantity && omniStore.available >= userQuantity) {
      // Both can fulfill → Dark store wins
      return [darkStore]
    }

    if (darkStore.available >= userQuantity) {
      return [darkStore]
    }

    if (omniStore.available >= userQuantity) {
      return [omniStore]
    }

    // If neither has enough individually but together can fulfill → return both
    if (darkStore.available + omniStore.available >= userQuantity) {
      return [darkStore, omniStore]
    }

    // None can fulfill
    return []
  }

  // CASE 2: Only Dark store exists
  if (darkStore) {
    return [darkStore]
  }

  // CASE 3: Only Omni store exists
  if (omniStore) {
    return [omniStore]
  }

  return []
}

async function allocateInventoryAcrossLocations(sortedInventoryList: any[], quantity: number) {
  const allocatedLocations: AllocatedLocation[] = []
  let remainingQuantity = quantity
  let isFullyAllocated = true

  for (const inventory of sortedInventoryList) {
    if (remainingQuantity <= 0) {
      break
    }

    const availableQty = inventory.stocked_quantity - (inventory.reserved_quantity || 0)
    const allocationQty = Math.min(remainingQuantity, availableQty)

    if (allocationQty > 0) {
      allocatedLocations.push({
        location_type: inventory.location_type,
        location_id: inventory.location_id,
        variant_id: inventory.variant_id,
        inventory_item_id: inventory.inventory_item_id,
        allocatedQuantity: allocationQty,
        originalAvailable: availableQty,
        inventoryRecord: inventory
      })

      remainingQuantity -= allocationQty
    }
  }

  if (remainingQuantity > 0) {
    isFullyAllocated = false
  }

  return { isFullyAllocated, allocatedLocations, remainingQuantity }
}

// For now not in use code
// async function updateAllocatedInventory(
//   allocatedLocations: AllocatedLocation[]
// ) {
//   const updatePromises = allocatedLocations.map(async (allocation) => {
//     await this.inventoryService.updateAllocatedQuantity(
//       allocation.inventoryRecord.id,
//       allocation.allocatedQuantity
//     );
//   });
//
//   await Promise.all(updatePromises);
// }

async function allocateSingleLineItem(lineItem: any, allInventory: any) {
  const key = `${lineItem.variant.id}-${lineItem.seller.id}`
  const availableInventory = allInventory[key] || []

  const sortedInventory = sortInventoryByPriority(availableInventory, Number(lineItem.quantity))

  const allocation = await allocateInventoryAcrossLocations(sortedInventory, Number(lineItem.quantity))

  if (allocation.isFullyAllocated) {
    // await updateAllocatedInventory(allocation.allocatedLocations)

    return {
      success: allocation.isFullyAllocated,
      allocatedLocations: allocation.allocatedLocations,
      remainingQuantity: allocation.remainingQuantity
    }
  } else {
    // throw new Error(`Insufficient inventory for item ${lineItem.itemId}`);
    return {
      success: allocation.isFullyAllocated,
      allocatedLocations: allocation.allocatedLocations,
      remainingQuantity: allocation.remainingQuantity
    }
  }
}

// Map inventory to each cart line items
export const mapCartItemsToLocationStep = createStep(
  'map-cart-items-to-location',
  async (
    input: MapCartItemsToLocation
  ): Promise<StepResponse<MapCartItemsToLocationOutput>> => {
    const { cart } = input

    // Validate Cart Line Items - now properly handle errors
    const { errors } = await validateCartLineItem(cart)

    if (errors.length > 0) {
      const errorDetails = errors.map(err => `Item ${err.id}: ${err.issues.join(', ')}`).join('; ')
      throw new Error(`Cart validation failed: ${errorDetails}`)
    }

    const shipping_address = cart.shipping_address
    const postal_code = shipping_address.postal_code

    const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as Knex
    const zone = await fetchZoneByPincode(postal_code, knex)

    if (!zone) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Zone not found for pincode: ${postal_code}`
      )
    }

    const darkStoreLocationId = zone.location_id

    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Get all omni store locations, parent_location_id is dark store location id and child_location_id is omni store location id
    const { data: locationHierarchies } = await query.graph({
      entity: 'location_hierarchy',
      fields: ['id', 'parent_location_id', 'child_location_id'],
      filters: { parent_location_id: darkStoreLocationId }
    })

    const childLocations: string[] = locationHierarchies.map((loc: LocationHierarchy) => loc.child_location_id)

    // Combine dark store + omni store cluster_id in one array
    const darkStoreWithChildrenStockLocation = [
      ...new Set([darkStoreLocationId, ...childLocations])
    ]

    // Group Cart Line Items by variant and seller
    const lineItemByVariantAndSeller = await groupCartLineItemByVariantAndSeller(cart)

    // Get all required inventory in batch
    const allRequiredInventory = await getRequiredInventory(lineItemByVariantAndSeller, darkStoreWithChildrenStockLocation)

    // Track all allocated locations for potential rollback
    const allAllocatedLocations: AllocatedLocation[] = []
    let overallSuccess = true
    let totalRemainingQuantity = 0

    // Process each line item
    for (const lineItem of cart.items) {
      const itemAllocationResult = await allocateSingleLineItem(
        lineItem,
        allRequiredInventory
      )

      if (!itemAllocationResult.success) {
        overallSuccess = false
        totalRemainingQuantity += itemAllocationResult.remainingQuantity
        break // Stop processing further items
      } else {
        // Store allocation data in line item metadata
        lineItem.metadata = {
          ...lineItem.metadata,
          allocatedLocations: itemAllocationResult.allocatedLocations,
          allocationSuccess: true
        }

        // Track all allocations for potential rollback
        allAllocatedLocations.push(...itemAllocationResult.allocatedLocations)
      }
    }

    const finalAllocationResult: AllocationResult = {
      success: overallSuccess,
      allocatedLocations: allAllocatedLocations,
      remainingQuantity: totalRemainingQuantity
    }

    // If allocation failed, throw an error to trigger Medusa's rollback
    if (!overallSuccess) {
      const insufficientItems = cart.items.filter(item => !item.metadata?.allocationSuccess)

      throw new Error(`Insufficient inventory available. Failed to allocate inventory for ${insufficientItems.length} item(s). Please check product availability.`)
    }

    const cartLineItemWithInventoryLocationData = cart

    return new StepResponse({
      cartLineItemWithInventoryLocationData,
      allocationResult: finalAllocationResult
    })
  }
)
