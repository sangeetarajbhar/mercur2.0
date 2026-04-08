"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const path_1 = __importDefault(require("path"));
(0, utils_1.loadEnv)(process.env.NODE_ENV || 'development', process.cwd());
module.exports = (0, utils_1.defineConfig)({
    admin: {
        disable: true
    },
    projectConfig: {
        databaseUrl: process.env.DATABASE_URL,
        http: {
            storeCors: process.env.STORE_CORS,
            adminCors: process.env.ADMIN_CORS,
            authCors: process.env.AUTH_CORS,
            // @ts-expect-error: vendorCors is not defined in medusa config module
            vendorCors: process.env.VENDOR_CORS,
            jwtSecret: process.env.JWT_SECRET || "supersecret",
            cookieSecret: process.env.COOKIE_SECRET || "supersecret",
        }
    },
    modules: [
        {
            resolve: '@mercurjs/core-plugin/modules/admin-ui',
            options: {
                appDir: path_1.default.join(__dirname, '../../apps/admin'),
                path: '/dashboard',
                disable: true
            }
        },
        {
            resolve: '@mercurjs/core-plugin/modules/vendor-ui',
            options: {
                appDir: path_1.default.join(__dirname, '../../apps/vendor'),
                path: '/seller',
                disable: true
            }
        },
        {
            resolve: "@mercurjs/core-plugin/modules/custom-fields",
            options: {
                customFields: {
                    ProductCollection: {
                        request_status: {
                            type: "enum",
                            enum: ["draft", "pending", "accepted", "rejected"],
                            defaultValue: "draft",
                        },
                        submitter_id: { type: "string", nullable: true },
                        reviewer_id: { type: "string", nullable: true },
                        reviewer_note: { type: "text", nullable: true },
                    },
                    ProductCategory: {
                        request_status: {
                            type: "enum",
                            enum: ["draft", "pending", "accepted", "rejected"],
                            defaultValue: "draft",
                        },
                        submitter_id: { type: "string", nullable: true },
                        reviewer_id: { type: "string", nullable: true },
                        reviewer_note: { type: "text", nullable: true },
                    },
                    ProductType: {
                        request_status: {
                            type: "enum",
                            enum: ["draft", "pending", "accepted", "rejected"],
                            defaultValue: "draft",
                        },
                        submitter_id: { type: "string", nullable: true },
                        reviewer_id: { type: "string", nullable: true },
                        reviewer_note: { type: "text", nullable: true },
                    },
                    ProductTag: {
                        request_status: {
                            type: "enum",
                            enum: ["draft", "pending", "accepted", "rejected"],
                            defaultValue: "draft",
                        },
                        submitter_id: { type: "string", nullable: true },
                        reviewer_id: { type: "string", nullable: true },
                        reviewer_note: { type: "text", nullable: true },
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
    ],
    plugins: [{
            resolve: "@mercurjs/core-plugin",
            options: {}
        }]
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVkdXNhLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL21lZHVzYS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxxREFBaUU7QUFFakUsZ0RBQXVCO0FBQ3ZCLElBQUEsZUFBTyxFQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxJQUFJLGFBQWEsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQTtBQUU3RCxNQUFNLENBQUMsT0FBTyxHQUFHLElBQUEsb0JBQVksRUFBQztJQUM1QixLQUFLLEVBQUU7UUFDTCxPQUFPLEVBQUUsSUFBSTtLQUNkO0lBQ0QsYUFBYSxFQUFFO1FBQ2IsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWTtRQUNyQyxJQUFJLEVBQUU7WUFDSixTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFXO1lBQ2xDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVc7WUFDbEMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBVTtZQUNoQyxzRUFBc0U7WUFDdEUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBWTtZQUNwQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksYUFBYTtZQUNsRCxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksYUFBYTtTQUN6RDtLQUNGO0lBQ0QsT0FBTyxFQUFFO1FBQ1A7WUFDRSxPQUFPLEVBQUUsd0NBQXdDO1lBQ2pELE9BQU8sRUFBRTtnQkFDUCxNQUFNLEVBQUUsY0FBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUM7Z0JBQ2hELElBQUksRUFBRSxZQUFZO2dCQUNsQixPQUFPLEVBQUUsSUFBSTthQUNZO1NBQzVCO1FBQ0Q7WUFDRSxPQUFPLEVBQUUseUNBQXlDO1lBQ2xELE9BQU8sRUFBRTtnQkFDUCxN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