import { MedusaService } from '@medusajs/framework/utils'

import { ExtraCharge, ExtraChargeRule } from './models'
import { ExtraChargeDTO } from './types'

class ExtraChargeService extends MedusaService({
  ExtraCharge,
  ExtraChargeRule
}) {
  // Rule evaluation methods
  async evaluateRules(context: {
    cart: any
    customer?: any
    region?: any
  }): Promise<(ExtraChargeDTO & { rule_id?: string })[]> {
    // Get all active extra charges
    const extraCharges = await this.listExtraCharges({ status: 'active' })
    const applicableCharges: (ExtraChargeDTO & { rule_id?: string })[] = []

    for (const charge of extraCharges) {
      const rules = await this.listExtraChargeRules({
        extra_charge_id: charge.id,
        status: 'active'
      })

      // if (this.shouldApplyCharge(charge, rules, context)) {
      //   applicableCharges.push(charge)
      // }

      const appliedRule = this.shouldApplyCharge(charge as ExtraChargeDTO, rules, context)
      if (appliedRule) {
        applicableCharges.push({
          ...charge,
          status: charge.status as 'active' | 'inactive',
          rule_id: appliedRule.id
        })
      }
    }

    return applicableCharges
  }

  private shouldApplyCharge(
    charge: ExtraChargeDTO,
    rules: Awaited<ReturnType<typeof this.listExtraChargeRules>>,
    context: any
  ): Awaited<ReturnType<typeof this.listExtraChargeRules>>[number] | null {
    // If no rules, apply to all (no specific rule)
    if (!rules.length) return null

    // Sort rules by priority (descending)
    const sortedRules = rules.sort((a, b) => b.priority - a.priority)

    // All rules must pass (AND logic) - return the first rule that passed
    for (const rule of sortedRules) {
      if (this.evaluateRule(rule, context)) {
        return rule
      }
    }

    return null
  }

  private evaluateRule(
    rule: Awaited<ReturnType<typeof this.listExtraChargeRules>>[number],
    context: any
  ): boolean {
    // Check validity period
    if (!this.isRuleValid(rule)) return false

    // Check cart conditions
    if (!this.checkCartConditions(rule, context.cart)) return false

    // Evaluate attribute-based rule
    return this.evaluateAttributeRule(rule, context)
  }

  private isRuleValid(
    rule: Awaited<ReturnType<typeof this.listExtraChargeRules>>[number]
  ): boolean {
    const now = new Date()

    if (rule.starts_at && new Date(rule.starts_at) > now) {
      return false
    }

    if (rule.ends_at && new Date(rule.ends_at) < now) {
      return false
    }

    return true
  }

  private checkCartConditions(
    rule: Awaited<ReturnType<typeof this.listExtraChargeRules>>[number],
    cart: any
  ): boolean {
    // Check cart total conditions
    if (rule.min_cart_total && cart.total < rule.min_cart_total) {
      return false
    }

    if (rule.max_cart_total && cart.total > rule.max_cart_total) {
      return false
    }

    // Check quantity conditions
    const totalQuantity =
      cart.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) ||
      0

    if (rule.min_quantity && totalQuantity < rule.min_quantity) {
      return false
    }

    if (rule.max_quantity && totalQuantity > rule.max_quantity) {
      return false
    }

    return true
  }

  private evaluateAttributeRule(
    rule: Awaited<ReturnType<typeof this.listExtraChargeRules>>[number],
    context: any
  ): boolean {
    const { attribute, operator, values } = rule
    let contextValue: any

    // Extract value based on attribute
    switch (attribute) {
      case 'customer_group':
        // Handle both single and multiple customer groups
        if (Array.isArray(context.customer?.groups)) {
          // Multiple groups - return array of IDs
          contextValue = context.customer.groups.map((group: any) => group.id || group)
        } else {
          // original logic
          contextValue = context.customer?.customer_group_id
        }
        break
      case 'region':
        contextValue = context.region?.id || context.cart?.region_id
        break
      case 'product_category':
        // Check if cart contains products from specific categories
        contextValue = this.getCartProductCategories(context.cart)
        break
      case 'order_total':
        contextValue = context.cart.total
        break
      case 'customer_email_domain':
        contextValue = context.customer?.email?.split('@')[1]
        break
      case 'cart_shipping_type':
        contextValue = context.cart.cart_extra_detail.shipping_type
        break
      default:
        // Check metadata or custom attributes
        contextValue = this.getCustomAttribute(attribute, context)
    }

    // Apply operator logic
    return this.applyOperator(operator as string, contextValue, values)
  }

  private getCartProductCategories(cart: any): string[] {
    if (!cart.items) return []

    const categories: string[] = []
    for (const item of cart.items) {
      if (item.variant?.product?.categories) {
        categories.push(
          ...item.variant.product.categories.map((cat: any) => cat.id)
        )
      }
    }

    return [...new Set(categories)] // Remove duplicates
  }

  private getCustomAttribute(attribute: string, context: any): any {
    // Check in cart metadata
    if (context.cart?.metadata?.[attribute]) {
      return context.cart.metadata[attribute]
    }

    // Check in customer metadata
    if (context.customer?.metadata?.[attribute]) {
      return context.customer.metadata[attribute]
    }

    return null
  }

  private applyOperator(
    operator: string,
    contextValue: any,
    ruleValues: string[]
  ): boolean {
    if (contextValue === null || contextValue === undefined) {
      return false
    }

    switch (operator) {
      case 'eq':
        // For multiple groups, check if any group matches
        if (Array.isArray(contextValue)) {
          return contextValue.some((v) => ruleValues.includes(String(v)))
        }
        return ruleValues.includes(String(contextValue))
      case 'in':
        return Array.isArray(contextValue)
          ? contextValue.some((v) => ruleValues.includes(String(v)))
          : ruleValues.includes(String(contextValue))
      case 'gt':
        return Number(contextValue) > Number(ruleValues[0])
      case 'lt':
        return Number(contextValue) < Number(ruleValues[0])
      case 'gte':
        return Number(contextValue) >= Number(ruleValues[0])
      case 'lte':
        return Number(contextValue) <= Number(ruleValues[0])
      default:
        return false
    }
  }
}

export default ExtraChargeService
