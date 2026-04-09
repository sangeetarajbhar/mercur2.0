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
      resolve: "./src/modules/attribute",
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
      resolve: "./src/modules/image-configuration",
    },
    {
      resolve: "./src/modules/location-hierarchy",
    },
    {
      resolve: "./src/modules/partner",
    }
  ],
  plugins: [{
    resolve: "@mercurjs/core-plugin",
    options: {}
  }]
})
