import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { DashboardModuleOptions } from '@mercurjs/types'
import path from 'path'
loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  admin: {
    disable: true
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
        disable: true
      } as DashboardModuleOptions
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: {
              channels: ["email"],
            },
          },
        ],
      },
    },
    {
      resolve: "@mercurjs/core-plugin/modules/custom-fields",
      options: {
        customFields: {
          CartLineItem: {
            seller_id: { type: "string", nullable: true },
          },
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
      resolve: "./src/modules/brand",
    },
    {
      resolve: "./src/modules/attribute",
    },
    {
      resolve: "./src/modules/system-config",
    },
    {
      resolve: "./src/modules/customer-bank-account-verification",
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
        apiKey: process.env.GOOGLE_MAPS_API_KEY || "",
      },
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
      resolve: "./src/modules/payout-transactions",
    },
    {
      resolve: "./src/modules/shopify_product_variant",
    },
    {
      resolve: "./src/modules/return-refund-type-link",
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
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          {
            resolve: "./src/modules/phone-auth",
            id: "phone-auth",
            options: {
              jwtSecret: process.env.JWT_SECRET || "supersecret",
            },
          },
        ],
      },
    },
  ],
  plugins: [{
    resolve: "@mercurjs/core-plugin",
    options: {}
  }]
})
