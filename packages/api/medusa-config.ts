import { loadEnv, defineConfig, Modules, ContainerRegistrationKeys, HasMany } from '@medusajs/framework/utils'
import { DashboardModuleOptions } from '@mercurjs/types'
import path from 'path'
loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  admin: {
    disable: true
  },
  featureFlags: {
    rbac: true,
    seller_registration: true
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      // @ts-expect-error: vendorCors is not defined in medusa config module
      vendorCors: process.env.VENDOR_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: '@mercurjs/core-plugin/modules/admin-ui',
      options: {
        appDir: path.join(__dirname, '../../apps/admin'),
        path: '/dashboard',
        disable: true
      } as DashboardModuleOptions
    },
    {
      resolve: '@mercurjs/core-plugin/modules/vendor-ui',
      options: {
        appDir: path.join(__dirname, '../../apps/vendor'),
        path: '/seller',
      } as DashboardModuleOptions
    },
    {
      resolve: '@medusajs/medusa/rbac',
      definition: {
        isQueryable: true,
      },
    },
    {
      resolve: "./src/modules/moengage_alert",
    },
    {
      resolve: "./src/modules/seller",
    },
    {
      resolve: "./src/modules/cart-extra-detail",
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: '@mercurjs/resend/providers/resend',
            id: 'resend',
            options: {
              channels: ['email'],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL
            }
          },
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: {
              channels: [ "feed", "seller_feed"],
            },
          },
          {
            resolve: './src/modules/moengage',
            id: 'moengage',
            options: {
              channels: ['sms_moengage', 'whatsapp_moengage', 'email_moengage', 'push_moengage'],
              workspace_id: process.env.MOENGAGE_WORKSPACE_ID,
              inform_api_key: process.env.MOENGAGE_INFORM_API_KEY,
              base_url: process.env.MOENGAGE_BASE_URL,
            }
          },
        ],
      },
    },
    {
      resolve: "@mercurjs/core-plugin/modules/custom-fields",
      options: {
        customFields: {
          // CartLineItem: {
          //   seller_id: { type: "string", nullable: true },
          // },
          ProductTag: {
            request_status: { type: "string", nullable: true },
            submitter_id: { type: "string", nullable: true },
            reviewer_id: { type: "string", nullable: true },
            reviewer_note: { type: "string", nullable: true },
          },
          ProductType: {
            request_status: { type: "string", nullable: true },
            submitter_id: { type: "string", nullable: true },
            reviewer_id: { type: "string", nullable: true },
            reviewer_note: { type: "string", nullable: true },
          },
          ProductCategory: {
            request_status: { type: "string", nullable: true },
            submitter_id: { type: "string", nullable: true },
            reviewer_id: { type: "string", nullable: true },
            reviewer_note: { type: "string", nullable: true },
          },
          ProductCollection: {
            request_status: { type: "string", nullable: true },
            submitter_id: { type: "string", nullable: true },
            reviewer_id: { type: "string", nullable: true },
            reviewer_note: { type: "string", nullable: true },
          },
        },
      },
    },
    {
      resolve: "./src/modules/zone",
    },
    {
      resolve: "./src/modules/instant-promises",
    },
    {
      resolve: "./src/modules/slot-definitions",
    },
    {
      resolve: "./src/modules/slot-overrides",
    },
    {
      resolve: "./src/modules/stock-location-extension",
    },
    {
      resolve: "./src/modules/controls",
    },
    {
      resolve: "./src/modules/brand",
    },
    {
      resolve: "./src/modules/system-config",
    },
    {
      resolve: "./src/modules/cart-delivery-detail",
    },
    {
      resolve: "./src/modules/customer-bank-account-verification",
    },
    {
      resolve: "./src/modules/cache",
      key: Modules.CACHE, // This replaces the default cache module
      options: {
        redisUrl: process.env.REDIS_URL,
        ttl: 86400 // default TTL in seconds (24 hours)
      },
    },
    {
      resolve: "@medusajs/medusa/caching",
      options: {
        providers: [
          {
            resolve: "@medusajs/caching-redis",
            id: "caching-redis",
            // Optional, makes this the default caching provider
            is_default: true,
            options: {
              redisUrl: process.env.REDIS_URL,
              // more options...
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/customer-bank-detail",
    },
    {
      resolve: "./src/modules/customer-upi-detail",
    },
    {
      resolve: "./src/modules/extra-charge",
    },
    {
      resolve: "./src/modules/cart-order-extra-charge",
    },
    {
      resolve: "./src/modules/customer-payment-preferences",
    },
    {
      resolve: "./src/modules/customer_refund_methods",
    },
    {
      resolve: "./src/modules/google-location",
      options: {
        apiKey: process.env.GOOGLE_API_KEY,
      },
    },
    {
      resolve: "./src/modules/stock-location-extension",
    },
    {
      resolve: "./src/modules/stock-location-section",
    },
    {
      resolve: "./src/modules/stock-location-document",
    },
    {
      resolve: "./src/modules/stock-location-contact",
    },
    {
      resolve: "./src/modules/product-configuration",
    },
    {
      resolve: "./src/modules/image-configuration",
    },
    {
      resolve: "./src/modules/location-hierarchy",
    },
    {
      resolve: "./src/modules/partner",
    },
    {
      resolve: './src/modules/enhanced-product-import'
    },
    {
      resolve: './src/modules/config-audit-logs'
    },
    {
      resolve: '@medusajs/medusa/file',
      options: {
        providers: [
          {
            resolve: './src/modules/file-s3-no-acl',
            id: 's3-no-acl',
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
            }
          }
          // {
          //   resolve: "@medusajs/medusa/file-local",
          //   id: "local",
          //   options: {
          //     upload_dir: "static",
          //     backend_url: "http://localhost:9000/static"
          //   },
          // },
        ]
      }
    },
    {
      resolve: "./src/modules/tier",
    },
    {
      resolve: "./src/modules/variant-images-settings",
    },
    {
      resolve: "./src/modules/video-encoding-jobs",
    },
    {
      resolve: "./src/modules/wishlist",
    },
    {
      resolve: './src/modules/search',
      options: {
        enabled: true
      }
    },
    {
      resolve: "./src/modules/pricing-extend",
      definition: {
        isQueryable: true,
      },
    },
    {
      resolve: "./src/modules/price-list-import-request",
      definition: {
        isQueryable: true,
      },
    },
    {
      resolve: "./src/modules/payout-transactions",
    },
    {
      resolve: "./src/modules/shopify_product_variant",
    },
    {
      resolve: "./src/modules/promotion_extension",
      definition: {
        isQueryable: true,
      },
    },
    {
      resolve: "./src/modules/return-refund-type-link",
    },
    {
      resolve: "./src/modules/refund-category",
      definition: {
        isQueryable: true,
      },
    },
    {
      resolve: './src/modules/search',
      options: {
        enabled: true
      }
    },
    {
      resolve: "./src/modules/order-reason-code",
    },
    {
      resolve: "./src/modules/customer",
    },
    // Providers must be registered on the core payment/auth modules — standalone
    // ModuleProvider entries have no `.service` and break defineConfig (Medusa 2.13+).
    // {
    //   resolve: "@medusajs/medusa/payment",
    //   // dependencies: [Modules.PAYMENT, ContainerRegistrationKeys.LOGGER],
    //   options: {
    //     providers: [
    //       {
    //         resolve: "./src/modules/payment-razorpay",
    //         id: "razorpay",
    //         options: {
    //           key_id:
    //             process?.env?.RAZORPAY_TEST_KEY_ID ??
    //             process?.env?.RAZORPAY_ID,
    //           key_secret:
    //             process?.env?.RAZORPAY_TEST_KEY_SECRET ??
    //             process?.env?.RAZORPAY_SECRET,
    //           razorpay_account:
    //             process?.env?.RAZORPAY_TEST_ACCOUNT ??
    //             process?.env?.RAZORPAY_ACCOUNT,
    //           automatic_expiry_period: 30 /* any value between 12minuts and 30 days expressed in minutes*/,
    //           manual_expiry_period: 20,
    //           refund_speed: "optimum",
    //           webhook_secret:
    //             process?.env?.RAZORPAY_TEST_WEBHOOK_SECRET ??
    //             process?.env?.RAZORPAY_WEBHOOK_SECRET,
    //           auto_capture: true // Automatic payment capture enabled
    //         }
    //       },
    //     ],
    //   },
    // },
    {
      resolve: '@medusajs/medusa/auth',
      dependencies: [
        Modules.CACHE,
        ContainerRegistrationKeys.LOGGER,
        Modules.EVENT_BUS
      ],
      options: {
        providers: [
          // default provider
          {
            resolve: '@medusajs/medusa/auth-emailpass',
            id: 'emailpass'
          },
          {
            resolve: './src/modules/phone-auth',
            id: 'phone-auth',
            options: {
              jwtSecret: process.env.PHONE_AUTH_JWT_SECRET || 'supersecret'
            }
          }
        ]
      }
    },
    {
      resolve: "./src/modules/rating",
    },
    { resolve: './src/modules/marketplace' },
    {
      resolve: './src/modules/split-order-payment',
      definition: {
        isQueryable: true,
      },
    },
    {
      resolve: "./src/modules/cart-delivery-detail",
    },
  ],
  plugins: [{
    resolve: "@mercurjs/core-plugin",
    options: {}
  }]
})
