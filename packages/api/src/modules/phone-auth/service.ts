import jwt from "jsonwebtoken"
import {
  AbstractAuthModuleProvider,
  AbstractEventBusModuleService
} from "@medusajs/framework/utils"

import {
  MedusaError,
} from "@medusajs/framework/utils"
import { Logger } from "@medusajs/medusa"
import { AuthenticationInput, AuthenticationResponse, AuthIdentityProviderService } from "@mercurjs/types"

type InjectedDependencies = {
  logger: Logger
  event_bus: AbstractEventBusModuleService
}

type Options = {
  jwtSecret: string
}

type AuthResponse = AuthenticationResponse & {
    otp?: string;
}


class PhoneAuthService extends AbstractAuthModuleProvider {
  static DISPLAY_NAME = "Phone Auth"
  static identifier = "phone-auth"
  private options: Options
  private logger: Logger
  private event_bus: AbstractEventBusModuleService


  constructor(container: InjectedDependencies, options: Options) {
    // @ts-expect-error - This is a workaround to avoid type errors
    super(...arguments)

    this.options = options
    this.logger = container.logger
    this.event_bus = container.event_bus
  }
  static validateOptions(options: Record<any, any>): void | never {
    if (!options.jwtSecret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "JWT secret is required"
      )
    }
  }

  async register(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const { phone } = data.body || {}

    if (!phone) {
      return {
        success: false,
        error: "Phone number is required",
      }
    }

    try {
      await authIdentityProviderService.retrieve({
        entity_id: phone,
      })

      return {
        success: false,
        error: "User with phone number already exists",
      }
    } catch (error) {
      this.logger.info(`Auth identity not found for phone: ${error}`)
      const user = await authIdentityProviderService.create({
        entity_id: phone,
      })

      return {
        success: true,
        authIdentity: user,
      }
    }
  }

  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthResponse> {
    const { phone } = data.body || {}
    // console.log("authenticate called with phone:", phone)

    if (!phone) {
      return {
        success: false,
        error: "Phone number is required",
      }
    }

    let authIdentity
    try {
      // Try to get existing auth identity
      authIdentity = await authIdentityProviderService.retrieve({
        entity_id: phone,
      })
    } catch (error) {
      this.logger.info(`Auth identity not found for phone: ${error}`)
      // Create new auth identity if doesn't exist
      authIdentity = await authIdentityProviderService.create({
        entity_id: phone,
      })
    }

    // Check 30-second cooldown before generating OTP
    const cooldownError = this.checkCooldown(authIdentity?.provider_identities)
    if (cooldownError) {
      return {
        success: false,
        error: cooldownError,
      }
    }

    // Check if customer exists, create if not
    await this.ensureCustomerExists(phone)

    const { hashedOTP, otp } = await this.generateOTP()

    // Get existing provider metadata to preserve it
    const phoneAuthProvider = authIdentity?.provider_identities?.find(
      (provider) => provider.provider === PhoneAuthService.identifier
    )
    const existingMetadata = phoneAuthProvider?.provider_metadata || {}

    await authIdentityProviderService.update(phone, {
      provider_metadata: {
        ...existingMetadata,
        otp: hashedOTP,
        lastOtpRequestTime: Date.now(),
      },
    })

    // send otp to user
    await this.event_bus.emit({
      name: "phone-auth.otp.generated",
      data: {
        otp,
        phone,
      },
    }, {})

    return {
      success: true,
      location: `otp:${otp}`,
      otp: otp
    }
  }

  async generateOTP(): Promise<{ hashedOTP: string, otp: string }> {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    const hashedOTP = jwt.sign({ otp }, this.options.jwtSecret, {
      expiresIn: "5m",
    })

    return { hashedOTP, otp }
  }

  async validateCallback(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const { phone, otp } = data.body || {}

    if (!phone || !otp) {
      return {
        success: false,
        error: "Phone number and OTP are required",
      }
    }

    const user = await authIdentityProviderService.retrieve({
      entity_id: phone,
    })

    if (!user) {
      return {
        success: false,
        error: "User with phone number does not exist",
      }
    }

    // verify that OTP is correct
    const userProvider = user.provider_identities?.find((provider) => provider.provider === this.identifier)
    if (!userProvider || !userProvider.provider_metadata?.otp) {
      return {
        success: false,
        error: "User with phone number does not have a phone auth provider",
      }
    }

    try {
      const decodedOTP = jwt.verify(
        userProvider.provider_metadata.otp as string,
        this.options.jwtSecret
      ) as { otp: string }

      if (decodedOTP.otp !== otp) {
        throw new Error("Invalid OTP")
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || "Invalid OTP",
      }
    }

    // Preserve rateLimit data when clearing OTP
    const existingMetadata = userProvider.provider_metadata || {}
    const updatedUser = await authIdentityProviderService.update(phone, {
      provider_metadata: {
        ...existingMetadata,
        otp: null,
      }
    })

    return {
      success: true,
      authIdentity: updatedUser,
    }
  }

  private async ensureCustomerExists(phone: string): Promise<void> {
    // Customer creation will be handled in the API route
    this.logger.info(`Auth identity created for phone: ${phone}`)
  }

  /**
   * Check 30-second cooldown between OTP requests
   */
  private checkCooldown(
    providerIdentities?: Array<{ provider: string; provider_metadata?: Record<string, any> }>
  ): string | null {
    const now = Date.now()
    const cooldownPeriod = 30 * 1000 // 30 seconds in milliseconds

    // Find phone-auth provider
    const phoneAuthProvider = providerIdentities?.find(
      (provider) => provider.provider === PhoneAuthService.identifier
    )

    const lastRequestTime = phoneAuthProvider?.provider_metadata?.lastOtpRequestTime as number | undefined

    // Check cooldown period
    if (lastRequestTime) {
      const timeSinceLastRequest = now - lastRequestTime
      if (timeSinceLastRequest < cooldownPeriod) {
        const remainingSeconds = Math.ceil((cooldownPeriod - timeSinceLastRequest) / 1000)
        return `Please wait ${remainingSeconds} second(s) before requesting a new OTP.`
      }
    }

    return null
  }

}

export default PhoneAuthService
