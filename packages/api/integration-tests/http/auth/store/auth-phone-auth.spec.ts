import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

jest.setTimeout(90_000)

// Prevent network calls to MoEngage during integration tests.
let mockedAxiosPost: jest.Mock

jest.mock("axios", () => {
  const post = jest.fn(async () => ({ status: 200, data: {} }))
  mockedAxiosPost = post

  return {
    __esModule: true,
    default: { post, isAxiosError: () => false },
    post,
    isAxiosError: () => false,
  }
})

async function ensureLoginOtpWithHashAlert(container: MedusaContainer) {
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const existing = await knex("moengage_alert")
    .select("id")
    .where("alert_name", "login_otp_with_hash_code")
    .whereNull("deleted_at")
    .first()

  if (existing) return

  await knex("moengage_alert").insert({
    id: `moa_${Date.now()}`,
    alert_id: `test_${Date.now()}`,
    alert_name: "login_otp_with_hash_code",
    is_sms: true,
    is_whatsapp: false,
    is_email: false,
    is_push: false,
    status: "1",
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  })
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("Auth - Customer Phone OTP", () => {
      let appContainer: MedusaContainer

      beforeAll(() => {
        appContainer = getContainer()
      })

      beforeEach(async () => {
        mockedAxiosPost.mockClear()
        await ensureLoginOtpWithHashAlert(appContainer)
      })

      it("GET /auth/customer/phone-auth returns 405", async () => {
        const res = await api.get("/auth/customer/phone-auth").catch((e) => e.response)
        expect(res.status).toBe(405)
        expect(res.data).toEqual(
          expect.objectContaining({
            success: false,
            error: "Method Not Allowed",
          })
        )
      })

      it("POST /auth/customer/phone-auth rejects invalid phone (zod validation)", async () => {
        const res = await api
          .post("/auth/customer/phone-auth", { phone: "123" })
          .catch((e) => e.response)

        expect(res.status).toBe(400)
      })

      it("POST /auth/customer/phone-auth then POST callback authenticates user", async () => {
        const phoneAuthResponse = await api.post("/auth/customer/phone-auth", {
          phone: "7777777777",
          hash_code: "unit-test-hash",
        })

        expect(phoneAuthResponse.status).toBe(200)
        expect(phoneAuthResponse.data).toEqual(
          expect.objectContaining({
            success: true,
            message: "OTP sent successfully",
          })
        )
        expect(typeof phoneAuthResponse.data.is_new_user).toBe("boolean")

        // OTP is sent to MoEngage notification payload.
        const moengagePayload = mockedAxiosPost.mock.calls.at(-1)?.[1] as
          | {
              payloads?: {
                SMS?: {
                  personalized_attributes?: {
                    otp_code?: string
                  }
                }
              }
            }
          | undefined

        const otp = moengagePayload?.payloads?.SMS?.personalized_attributes?.otp_code
        expect(otp).toBeDefined()

        const callbackResponse = await api.post("/auth/customer/phone-auth/callback", {
          phone: "7777777777",
          otp,
          is_new_user: phoneAuthResponse.data.is_new_user,
        })

        expect(callbackResponse.status).toBe(200)
        expect(callbackResponse.data).toEqual(
          expect.objectContaining({
            success: true,
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          })
        )
        expect(callbackResponse.headers.authorization).toEqual(expect.stringMatching(/^Bearer /))
      })
    })
  },
})

