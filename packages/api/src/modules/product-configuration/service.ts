import { MedusaService, Modules } from "@medusajs/framework/utils"
import { Logger, LinkDefinition } from "@medusajs/framework/types"
import { ProductConfiguration } from "./models/product-configuration"
import { PRODUCT_CONFIGURATION_MODULE } from "./index"

export interface ProductConfigurationInput {
  id?: string
  is_returnable?: boolean
  is_exchangeable?: boolean
  is_try_and_buy?: boolean
  returnable_days?: number | string
}

class ProductConfigurationService extends MedusaService({
  ProductConfiguration,
}) {
  private logger_: Logger

  constructor(container: any) {
    super(...arguments)
    this.logger_ = container.logger
  }

  // @ts-expect-error - Overriding generated service property with a strict method signature
  async createProductConfigurations(data: ProductConfigurationInput[], sharedContext?: any): Promise<any[]>
  async createProductConfigurations(data: ProductConfigurationInput, sharedContext?: any): Promise<any>
  async createProductConfigurations(data: ProductConfigurationInput | ProductConfigurationInput[], sharedContext?: any): Promise<any | any[]> {
    this.logger_.debug('Creating product configuration with data:')

    if (Array.isArray(data)) {
      const validatedData = data.map((d) => this.validateConfigurationData(d))
      return await super.createProductConfigurations(validatedData as any, sharedContext)
    }

    const validatedData = this.validateConfigurationData(data as ProductConfigurationInput)
    return await super.createProductConfigurations(validatedData as any, sharedContext)
  }

  // @ts-expect-error - Overriding generated service property with a strict method signature
  async updateProductConfigurations(data: any, sharedContext?: any): Promise<any | any[]> {
    this.logger_.debug('Updating product configuration with data:')

    if (Array.isArray(data)) {
      const validatedData = data.map((d) => ({
        ...d,
        ...this.validateConfigurationData(d)
      }))
      return await super.updateProductConfigurations(validatedData as any, sharedContext)
    }

    const validatedData = {
      ...data,
      ...this.validateConfigurationData(data)
    }
    return await super.updateProductConfigurations(validatedData as any, sharedContext)
  }

  async createProductConfigurationWithLink(
    productId: string,
    configData: ProductConfigurationInput
  ): Promise<{ productConfig: any; linkData: LinkDefinition }> {
    try {
      const productConfig = await this.createProductConfigurations(configData)

      const linkData: LinkDefinition = {
        [Modules.PRODUCT]: { product_id: productId },
        [PRODUCT_CONFIGURATION_MODULE]: { product_configuration_id: productConfig.id }
      }

      this.logger_.debug(`Configuration ${productConfig.id} created for product ${productId}`)

      return { productConfig, linkData }
    } catch (error) {
      this.logger_.error(`Failed to create configuration for product ${productId}:`, error)
      throw error
    }
  }

  createRemovalLinkData(productId: string): LinkDefinition {
    return {
      [Modules.PRODUCT]: { product_id: productId },
      [PRODUCT_CONFIGURATION_MODULE]: {}
    }
  }

  validateConfigurationData(data: ProductConfigurationInput): ProductConfigurationInput {
    const validated: ProductConfigurationInput = {}

    if (data.is_returnable !== undefined) {
      validated.is_returnable = this.validateBoolean(data.is_returnable, 'is_returnable')
    }

    if (data.is_exchangeable !== undefined) {
      validated.is_exchangeable = this.validateBoolean(data.is_exchangeable, 'is_exchangeable')
    }

    if (data.is_try_and_buy !== undefined) {
      validated.is_try_and_buy = this.validateBoolean(data.is_try_and_buy, 'is_try_and_buy')
    }

    // Business validation: if is_returnable is true, returnable_days is required and must be > 0
    if (validated.is_returnable === true) {
      if (data.returnable_days === undefined || data.returnable_days === null || data.returnable_days === '' || 
          (typeof data.returnable_days === 'string' && parseInt(data.returnable_days) <= 0) ||
          (typeof data.returnable_days === 'number' && data.returnable_days <= 0)) {
        throw new Error('returnable_days is required when is_returnable is true and must be greater than 0')
      }
      // Validate returnable_days when is_returnable is true
      validated.returnable_days = this.validateReturnableDays(data.returnable_days)
    } else {
      // When is_returnable is false, returnable_days is optional but if provided, should be validated
      if (data.returnable_days !== undefined) {
        validated.returnable_days = this.validateReturnableDays(data.returnable_days)
      }
    }

    return validated
  }

  private validateBoolean(value: any, fieldName: string): boolean {
    if (typeof value === 'boolean') return value

    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim()
      if (['true', '1', 'yes'].includes(lower)) return true
      if (['false', '0', 'no'].includes(lower)) return false
    }

    throw new Error(`Invalid boolean value for ${fieldName}: ${value}. Must be true/false, 1/0, or yes/no`)
  }

  private validateReturnableDays(value: any): string {
    const num = parseInt(String(value), 10)
    if (isNaN(num) || num < 0) {
      throw new Error(`Invalid returnable_days: ${value}. Must be a non-negative number`)
    }
    return String(num)
  }

  createConfigValidators(): Map<string, (value: any) => { valid: boolean; message?: string }> {
    const validators = new Map<string, (value: any) => { valid: boolean; message?: string }>()

    const booleanValidator = (value: any) => {
      try {
        this.validateBoolean(value, 'field')
        return { valid: true }
      } catch (error) {
        return { valid: false, message: 'Must be true/false, 1/0, or yes/no' }
      }
    }

    validators.set('is_returnable', booleanValidator)
    validators.set('is_exchangeable', booleanValidator)
    validators.set('is_try_and_buy', booleanValidator)

    validators.set('returnable_days', (value: any) => {
      try {
        this.validateReturnableDays(value)
        return { valid: true }
      } catch (error) {
        return { valid: false, message: 'Must be a non-negative number' }
      }
    })

    return validators
  }
}

export default ProductConfigurationService