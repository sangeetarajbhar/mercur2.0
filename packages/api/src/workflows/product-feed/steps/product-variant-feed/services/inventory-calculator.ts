/**
 * Inventory Calculator Service
 * Single Responsibility: Calculates product availability based on inventory
 */

export class InventoryCalculator {
  static calculateAvailability(variant: any): string {
    let totalStocked = 0
    let totalReserved = 0

    for (const invItem of (variant as any).inventory_items || []) {
      for (const level of invItem.inventory?.location_levels || []) {
        totalStocked += level.stocked_quantity || 0
        totalReserved += level.reserved_quantity || 0
      }
    }

    const availableQty = totalStocked - totalReserved

    // const stockStatus = !variant.manage_inventory
    //   ? "in_stock"
    //   : availableQty > 0
    //     ? "in_stock"
    //     : "out_of_stock"
    return availableQty > 0 ? "in_stock" : "out_of_stock"
  }
}
