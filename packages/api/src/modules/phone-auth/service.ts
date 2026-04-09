import jwt from "jsonwebtoken"
import { AbstractAuthModuleProvider, MedusaError } from "@medusajs/framework/utils"
import type { AuthenticationInput, AuthenticationResponse, AuthIdentityProviderService, Logger } from "@medusajs/framework/types"

type InjectedDependencies = { logger: Logger }
type Options = { jwtSecret: string }

class PhoneAuthService extends AbstractAuthModuleProvider {
  static DISPLAY_NAME = "Phone Auth"
  static identifier = "phone-auth"

  private options: Options
  private logger: Logger

  constructor(container: InjectedDependencies, options: Options) {
    // @ts-expect-error framework constructor signature
    super(...arguments)
    this.options = options
    this.logger = container.logger
  }

  static validateOptions(options: Record<string, unknown>): void {
    if (!options?.jwtSecret) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "JWT secret is required")
    }
  }

  async register(data: AuthenticationInput, authIdentityProviderService: AuthIdentityProviderService): Promise<AuthenticationResponse> {
    const { phone } = (data.body || {}) as { phone?: string }
    if (!phone) {
      return { success: false, error: "Phone number is required" }
    }

    try {
      await authIdentityProviderService.retrieve({ entity_id: phone })
      return { success: false, error: "User with phone number already exists" }
    } catch {
      const user = await authIdentityProviderService.create({ entity_id: phone })
      return { success: true, authIdentity: user }
    }
  }

  async authenticate(data: AuthenticationInput, authIdentityProviderService: AuthIdentityProviderService): Promise<AuthenticationResponse> {
    const { phone } = (data.body || {}) as { phone?: string }
    if (!phone) {
      return { success: false, error: "Phone number is required" }
    }

    let authIdentity
    try {
      authIdentity = await authIdentityProviderService.retrieve({ entity_id: phone })
    } catch {
      authIdentity = await authIdentityProviderService.create({ entity_id: phone })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const hashedOTP = jwt.sign({ otp }, this.options.jwtSecret, { expiresIn: "5m" })
    const existingMetadata =
      authIdentity?.provider_identities?.find((provider) => provider.provider === PhoneAuthService.identifier)?.provider_metadata || {}

    await authIdentityProviderService.update(phone, {
      provider_metadata: { ...existingMetadata, otp: hashedOTP, lastOtpRequestTime: Date.now() },
    })

    this.logger.info(`Generated OTP for ${phone}`)
    return { success: true, authIdentity }
  }

  async validateCallback(data: AuthenticationInput, authIdentityProviderService: AuthIdentityProviderService): Promise<AuthenticationResponse> {
    const { phone, otp } = (data.body || {}) as { phone?: string; otp?: string }
    if (!phone || !otp) {
      return { success: false, error: "Phone number and OTP are required" }
    }

    const user = await authIdentityProviderService.retrieve({ entity_id: phone })
    const userProvider = user.provider_identities?.find((provider) => provider.provider === PhoneAuthService.identifier)
    const hashed = userProvider?.provider_metadata?.otp as string | undefined
    if (!hashed) {
      return { success: false, error: "OTP not generated for this phone" }
    }

    try {
      const decoded = jwt.verify(hashed, this.options.jwtSecret) as { otp: string }
      if (decoded.otp !== otp) {
        throw new Error("Invalid OTP")
      }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Invalid OTP" }
    }

    const updated = await authIdentityProviderService.update(phone, {
      provider_metadata: { ...(userProvider?.provider_metadata || {}), otp: null },
    })
    return { success: true, authIdentity: updated }
  }
}

export default PhoneAuthService
