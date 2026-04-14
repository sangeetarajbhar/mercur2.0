import { ExecArgs } from '@medusajs/framework/types'
import OrderReasonCodeModuleService from '../modules/order-reason-code/service'
import { ORDER_REASON_CODE_MODULE } from '../modules/order-reason-code'

export default async function seedOrderRejectCancelReasonCodes({ container }: ExecArgs) {
  const orderReasonCodeService: OrderReasonCodeModuleService = container.resolve(ORDER_REASON_CODE_MODULE)

  const reasonCodes = [
    {
      reason_code: 'BACKSTORE_ITEM',
      reason: 'Product in Backroom Storage',
    },
    {
      reason_code: 'BARCODE_MISMATCH',
      reason: 'Barcode Scanning Discrepancy',
    },
    {
      reason_code: 'INVENTORY_MISMATCH',
      reason: 'Online Stock Inventory Discrepancy',
    },
    {
      reason_code: 'LAST_PIECE',
      reason: 'Final Item Available in Retail',
    },
    {
      reason_code: 'MANNEQUIN_DISPLAY',
      reason: 'Display on Mannequin',
    },
    {
      reason_code: 'DAMAGED_ITEM',
      reason: 'Faulty or Defective Product',
    },
    {
      reason_code: 'WITH_CUSTOMER',
      reason: 'Item Currently with In-Store Customer',
    },
    {
      reason_code: 'NOT_AVAILABLE',
      reason: 'Item Not Present on Physical Shelf',
    },
    {
      reason_code: 'SIZE_MISMATCH',
      reason: 'Incorrect Size Variation',
    },
    {
      reason_code: 'TAG_ISSUE',
      reason: 'Absent or Incorrect Price Tag',
    },
    {
      reason_code: 'TECH_ERROR',
      reason: 'Technical System Failure',
    },
    {
      reason_code: 'UNIFORM_PRODUCT',
      reason: 'Standardized Product Variant',
    },
    {
      reason_code: 'MISSING_OSM',
      reason: 'Absent from Online Sales Management Inventory',
    },
    {
      reason_code: 'OTHERS',
      reason: 'Miscellaneous Reasons',
    },
  ]

  // Use the service directly - simpler and more efficient for seeding
  const results = await orderReasonCodeService.createOrderRejectCancelReasonCodes(reasonCodes)

  return results
}

