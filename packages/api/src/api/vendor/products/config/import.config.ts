/**
 * Product Import Configuration
 * 
 * Centralized configuration management for the product import feature.
 * Supports environment-specific settings and runtime configuration updates.
 */

import { z } from 'zod'

// Configuration schema for validation
const ImportConfigSchema = z.object({
  // File upload limits
  maxFileSize: z.number().min(1024).max(100 * 1024 * 1024), // 1KB to 100MB
  maxRowsPerFile: z.number().min(1).max(50000), // 1 to 50,000 rows
  supportedFormats: z.array(z.string()).default(['csv']),
  
  // Processing limits
  maxConcurrentJobs: z.number().min(1).max(20).default(3),
  defaultBatchSize: z.number().min(1).max(1000).default(100),
  maxBatchSize: z.number().min(1).max(1000).default(100),
  
  // Background processing
  backgroundThreshold: z.number().min(1).default(100), // Rows threshold for background processing
  jobTimeout: z.number().min(60000).default(1800000), // 30 minutes default
  maxRetries: z.number().min(0).max(10).default(3),
  retryDelay: z.number().min(1000).default(5000), // 5 seconds
  
  // Rate limiting
  rateLimit: z.object({
    windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    maxRequests: z.number().default(5),
    skipSuccessfulRequests: z.boolean().default(false)
  }),
  
  // Image processing
  imageProcessing: z.object({
    enabled: z.boolean().default(true),
    maxConcurrentImages: z.number().min(1).max(10).default(2),
    timeout: z.number().min(5000).default(30000), // 30 seconds - more aggressive timeout
    maxRetries: z.number().min(0).max(5).default(3),
    skipFailedImages: z.boolean().default(true), // Continue processing even if some images fail
    supportedFormats: z.array(z.string()).default(['jpg', 'jpeg', 'png', 'webp']),
    outputFormat: z.enum(['webp', 'jpeg', 'png']).default('webp'),
    quality: z.number().min(1).max(100).default(85),
    maxImageSize: z.number().default(50 * 1024 * 1024), // 50MB
    sizes: z.array(z.object({
      name: z.string(),
      width: z.number().min(0),
      height: z.number().min(0),
      fit: z.enum(['contain', 'cover', 'fill', 'inside', 'outside']).default('contain'),
      quality: z.number().min(1).max(100).optional()
    })).default([
      { name: 'thumbnail', width: 80, height: 107, fit: 'contain' },
      { name: 'small', width: 160, height: 213, fit: 'contain' },
      { name: 'medium', width: 256, height: 341, fit: 'contain' },
      { name: 'large', width: 512, height: 683, fit: 'contain' },
      { name: 'xlarge', width: 800, height: 1067, fit: 'contain' },
      { name: 'xxlarge', width: 960, height: 1280, fit: 'contain' },
      { name: 'original', width: 0, height: 0, fit: 'contain' }
    ])
  }),
  
  // Validation settings
  validation: z.object({
    strictMode: z.boolean().default(false),
    allowDuplicateHandles: z.boolean().default(true),
    requireImages: z.boolean().default(false),
    maxAttributesPerProduct: z.number().min(1).default(50),
    requiredFields: z.array(z.string()).default([
      'Product Handle',
      'Product Title',
      'Product Brand',
      'Article Type',
      'SKU Code',
      'MRP'
    ]),
    customValidators: z.array(z.string()).default([])
  }),
  
  // Notification settings
  notifications: z.object({
    enabled: z.boolean().default(true),
    channels: z.array(z.string()).default(['seller_feed']),
    templates: z.object({
      started: z.string().default('vendor-ui'),
      completed: z.string().default('vendor-ui'),
      failed: z.string().default('vendor-ui')
    }),
    thresholds: z.object({
      errorRate: z.number().min(0).max(1).default(0.1), // 10% error rate
      processingTime: z.number().default(1800000) // 30 minutes
    })
  }),
  
  // Storage settings
  storage: z.object({
    statusTTL: z.number().default(7 * 24 * 60 * 60), // 7 days in seconds
    cleanupInterval: z.number().default(24 * 60 * 60), // 24 hours in seconds
    cacheEnabled: z.boolean().default(true),
    cacheSize: z.number().default(1000)
  }),
  
  // Monitoring and logging
  monitoring: z.object({
    enabled: z.boolean().default(true),
    metricsInterval: z.number().default(60000), // 1 minute
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    enablePerformanceTracking: z.boolean().default(true)
  }),
  
  // Feature flags
  features: z.object({
    dryRunEnabled: z.boolean().default(true),
    validationOnlyEnabled: z.boolean().default(true),
    imageSkipEnabled: z.boolean().default(true),
    batchProcessingEnabled: z.boolean().default(true),
    retryEnabled: z.boolean().default(true),
    webhooksEnabled: z.boolean().default(false)
  })
})

export type ImportConfig = z.infer<typeof ImportConfigSchema>

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ImportConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxRowsPerFile: 10000,
  supportedFormats: ['csv'],
  
  maxConcurrentJobs: 3,
  defaultBatchSize: 100,
  maxBatchSize: 100,
  
  backgroundThreshold: 100,
  jobTimeout: 30 * 60 * 1000, // 30 minutes
  maxRetries: 3,
  retryDelay: 5000,
  
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: false
  },
  
  imageProcessing: {
    enabled: true,
    maxConcurrentImages: 2,
    timeout: 60000,
    maxRetries: 3,
    skipFailedImages: true,
    supportedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    outputFormat: 'webp',
    quality: 85,
    maxImageSize: 50 * 1024 * 1024,
    sizes: [
      { name: 'thumbnail', width: 80, height: 107, fit: 'contain' },
      { name: 'small', width: 160, height: 213, fit: 'contain' },
      { name: 'medium', width: 256, height: 341, fit: 'contain' },
      { name: 'large', width: 512, height: 683, fit: 'contain' },
      { name: 'xlarge', width: 800, height: 1067, fit: 'contain' },
      { name: 'xxlarge', width: 960, height: 1280, fit: 'contain' },
      { name: 'original', width: 0, height: 0, fit: 'contain' }
    ]
  },
  
  validation: {
    strictMode: false,
    allowDuplicateHandles: true,
    requireImages: false,
    maxAttributesPerProduct: 50,
    requiredFields: [
      'Product Handle',
      'Product Title',
      'Product Brand',
      'Article Type',
      'SKU Code',
      'MRP'
    ],
    customValidators: []
  },
  
  notifications: {
    enabled: true,
    channels: ['seller_feed'],
    templates: {
      started: 'vendor-ui',
      completed: 'vendor-ui',
      failed: 'vendor-ui'
    },
    thresholds: {
      errorRate: 0.1,
      processingTime: 1800000
    }
  },
  
  storage: {
    statusTTL: 7 * 24 * 60 * 60, // 7 days
    cleanupInterval: 24 * 60 * 60, // 24 hours
    cacheEnabled: true,
    cacheSize: 1000
  },
  
  monitoring: {
    enabled: true,
    metricsInterval: 60000,
    logLevel: 'info',
    enablePerformanceTracking: true
  },
  
  features: {
    dryRunEnabled: true,
    validationOnlyEnabled: true,
    imageSkipEnabled: true,
    batchProcessingEnabled: true,
    retryEnabled: true,
    webhooksEnabled: false
  }
}

/**
 * Environment-specific configuration overrides
 */
const ENVIRONMENT_CONFIGS: Record<string, Partial<ImportConfig>> = {
  development: {
    maxFileSize: 10 * 1024 * 1024, // 10MB in dev
    maxRowsPerFile: 1000,
    maxConcurrentJobs: 2,
    monitoring: {
      enabled: true,
      metricsInterval: 60000,
      logLevel: 'debug',
      enablePerformanceTracking: true
    }
  },
  
  test: {
    maxFileSize: 1024 * 1024, // 1MB in test
    maxRowsPerFile: 100,
    maxConcurrentJobs: 1,
    jobTimeout: 60000, // 1 minute
    imageProcessing: {
      enabled: false, // Disable image processing in tests
      maxConcurrentImages: 0,
      timeout: 0,
      maxRetries: 0,
      skipFailedImages: false,
      supportedFormats: [],
      outputFormat: 'webp',
      quality: 85,
      maxImageSize: 0,
      sizes: []
    },
    notifications: {
      enabled: false,
      channels: [],
      templates: {
        started: '',
        completed: '',
        failed: ''
      },
      thresholds: {
        errorRate: 0,
        processingTime: 0
      }
    },
    monitoring: {
      enabled: false,
      metricsInterval: 0,
      logLevel: 'error',
      enablePerformanceTracking: false
    }
  },
  
  staging: {
    maxFileSize: 25 * 1024 * 1024, // 25MB in staging
    maxRowsPerFile: 5000,
    maxConcurrentJobs: 3,
    monitoring: {
      enabled: true,
      metricsInterval: 60000,
      logLevel: 'info',
      enablePerformanceTracking: true
    }
  },
  
  production: {
    maxFileSize: 50 * 1024 * 1024, // 50MB in production
    maxRowsPerFile: 10000,
    maxConcurrentJobs: 5,
    validation: {
      strictMode: true,
      allowDuplicateHandles: true,
      requireImages: false,
      maxAttributesPerProduct: 50,
      requiredFields: [
        'Product Handle',
        'Product Title',
        'Product Brand',
        'Article Type',
        'SKU Code',
        'MRP'
      ],
      customValidators: []
    },
    monitoring: {
      enabled: true,
      metricsInterval: 60000,
      logLevel: 'warn',
      enablePerformanceTracking: true
    },
    features: {
      dryRunEnabled: true,
      validationOnlyEnabled: true,
      imageSkipEnabled: true,
      batchProcessingEnabled: true,
      retryEnabled: true,
      webhooksEnabled: true
    }
  }
}

/**
 * Configuration manager class
 */
export class ImportConfigManager {
  private static instance: ImportConfigManager
  private config: ImportConfig
  private listeners: Array<(config: ImportConfig) => void> = []

  private constructor() {
    this.config = this.loadConfig()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ImportConfigManager {
    if (!ImportConfigManager.instance) {
      ImportConfigManager.instance = new ImportConfigManager()
    }
    return ImportConfigManager.instance
  }

  /**
   * Load configuration from environment and defaults
   */
  private loadConfig(): ImportConfig {
    const environment = process.env.NODE_ENV || 'development'
    const envConfig = ENVIRONMENT_CONFIGS[environment] || {}
    
    // Merge default config with environment-specific overrides
    const mergedConfig = this.deepMerge(DEFAULT_CONFIG, envConfig)
    
    // Apply environment variable overrides
    const envOverrides = this.loadFromEnvironment()
    const finalConfig = this.deepMerge(mergedConfig, envOverrides)
    
    // Validate the final configuration
    try {
      return ImportConfigSchema.parse(finalConfig)
    } catch (error) {
      console.error('Invalid import configuration:', error)
      console.warn('Falling back to default configuration')
      return DEFAULT_CONFIG
    }
  }

  /**
   * Load configuration overrides from environment variables
   */
  private loadFromEnvironment(): Partial<ImportConfig> {
    const overrides: Record<string, unknown> = {}
    
    // File limits
    if (process.env.IMPORT_MAX_FILE_SIZE) {
      overrides.maxFileSize = parseInt(process.env.IMPORT_MAX_FILE_SIZE)
    }
    
    if (process.env.IMPORT_MAX_ROWS) {
      overrides.maxRowsPerFile = parseInt(process.env.IMPORT_MAX_ROWS)
    }
    
    // Processing limits
    if (process.env.IMPORT_MAX_CONCURRENT_JOBS) {
      overrides.maxConcurrentJobs = parseInt(process.env.IMPORT_MAX_CONCURRENT_JOBS)
    }
    
    if (process.env.IMPORT_DEFAULT_BATCH_SIZE) {
      overrides.defaultBatchSize = parseInt(process.env.IMPORT_DEFAULT_BATCH_SIZE)
    }
    
    if (process.env.IMPORT_BACKGROUND_THRESHOLD) {
      overrides.backgroundThreshold = parseInt(process.env.IMPORT_BACKGROUND_THRESHOLD)
    }
    
    // Image processing
    if (process.env.IMPORT_IMAGE_PROCESSING_ENABLED) {
      overrides.imageProcessing = {
        ...(overrides.imageProcessing as Record<string, unknown> || {}),
        enabled: process.env.IMPORT_IMAGE_PROCESSING_ENABLED === 'true'
      }
    }
    
    if (process.env.IMPORT_IMAGE_OUTPUT_FORMAT) {
      overrides.imageProcessing = {
        ...(overrides.imageProcessing as Record<string, unknown> || {}),
        outputFormat: process.env.IMPORT_IMAGE_OUTPUT_FORMAT as 'webp' | 'jpeg' | 'png'
      }
    }
    
    // Monitoring
    if (process.env.IMPORT_LOG_LEVEL) {
      overrides.monitoring = {
        ...(overrides.monitoring as Record<string, unknown> || {}),
        logLevel: process.env.IMPORT_LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug'
      }
    }
    
    return overrides
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target }
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(
          (target[key] as Record<string, unknown>) || {}, 
          source[key] as Record<string, unknown>
        )
      } else {
        result[key] = source[key]
      }
    }
    
    return result
  }

  /**
   * Get current configuration
   */
  getConfig(): ImportConfig {
    return { ...this.config }
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<ImportConfig>): void {
    try {
      const newConfig = this.deepMerge(this.config, updates)
      const validatedConfig = ImportConfigSchema.parse(newConfig)
      
      this.config = validatedConfig
      
      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener(this.config)
        } catch (error) {
          console.error('Error in config change listener:', error)
        }
      })
      
    } catch (error) {
      console.error('Failed to update import configuration:', error)
      throw new Error(`Invalid configuration update: ${error.message}`)
    }
  }

  /**
   * Subscribe to configuration changes
   */
  onChange(listener: (config: ImportConfig) => void): () => void {
    this.listeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Reload configuration from environment
   */
  reload(): void {
    this.config = this.loadConfig()
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.config)
      } catch (error) {
        console.error('Error in config reload listener:', error)
      }
    })
    
  }

  /**
   * Get configuration for specific environment
   */
  getEnvironmentConfig(environment: string): ImportConfig {
    const envConfig = ENVIRONMENT_CONFIGS[environment] || {}
    const mergedConfig = this.deepMerge(DEFAULT_CONFIG, envConfig)
    
    return ImportConfigSchema.parse(mergedConfig)
  }

  /**
   * Validate configuration
   */
  validateConfig(config: unknown): { valid: boolean; errors: string[] } {
    try {
      ImportConfigSchema.parse(config)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }
      }
      return { valid: false, errors: [error.message] }
    }
  }
}

/**
 * Get the current import configuration
 */
export function getImportConfig(): ImportConfig {
  return ImportConfigManager.getInstance().getConfig()
}

/**
 * Update import configuration
 */
export function updateImportConfig(updates: Partial<ImportConfig>): void {
  ImportConfigManager.getInstance().updateConfig(updates)
}

/**
 * Subscribe to configuration changes
 */
export function onConfigChange(listener: (config: ImportConfig) => void): () => void {
  return ImportConfigManager.getInstance().onChange(listener)
}
