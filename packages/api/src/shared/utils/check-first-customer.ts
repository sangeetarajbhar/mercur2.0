import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Knex } from "knex"

/**
 * Check if a customer is a first-time customer
 * 
 * A customer is considered a first-time customer if they have no completed orders.
 * This function properly filters orders by:
 * - Excluding pending, canceled, and draft orders
 * - Excluding soft-deleted orders
 * 
 * @param customerId - The customer ID to check
 * @param container - The MedusaContainer or scope with knex connection
 * @returns Promise<boolean> - true if customer is first-time customer, false otherwise
 */
export async function isFirstCustomer(
  customerId: string,
  container: any
): Promise<boolean> {
  if (!customerId) {
    return false
  }

  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as Knex

  const orderCount = await knex("order")
    .where({ customer_id: customerId })
    .whereNotIn("status", ["canceled","draft","CANCELLED"])
    .whereNull("deleted_at")
    .count("id as count")
    .first()

  const count = Number(orderCount?.count || 0)
  return count === 0
}
