import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  FilterableCustomerProps,
  IAuthModuleService,
  ICustomerModuleService,
} from "@mercurjs/types"
import { generateJwtTokenForAuthIdentity } from "../../../utils/generate-jwt-token"
import { SYSTEM_CONFIG_SECTION_MODULE } from "../../../../../modules/system-config"
import SystemConfigModuleService from "../../../../../modules/system-config/service"
import { CustomerWorkflowEvents } from "../../../../../subscribers/notification-buyer-account-created"
import { getAgentType } from "../../../../../shared/utils/get-agent-type"

type ExtendedFilterableCustomerProps = FilterableCustomerProps & {
  phone?: string
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { phone, otp, is_new_user } = req.body as { phone: string; otp: string; is_new_user: boolean }
  const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH)
  const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)

  if (!phone || !otp) {
    return res.status(400).json({
      success: false,
      error: "Phone number and OTP are required"
    })
  }

  try {
    const customers = await customerModuleService.listCustomers({ phone, deleted_at: null } as ExtendedFilterableCustomerProps)
    const customer = customers[0]
    
    let authIdentity
    let authUserIdentity

    const env = process.env.NODE_ENV;
    //!can remove from prod later
    const otpBypassAllowedEnvs = ['stage', 'local', 'dev', 'development', 'production', 'prod']

    // Get OTP bypass configuration from system config
    let bypassPhone: string | null = null
    let bypassOtp: string | null = null
    
    if (otpBypassAllowedEnvs.includes(env?.toLowerCase() || '')) {
      try {
        const systemConfigService = req.scope.resolve(SYSTEM_CONFIG_SECTION_MODULE) as SystemConfigModuleService
        const [configs] = await systemConfigService.listAndCountSystemConfigs({
          key: ['otp_bypass_phone', 'otp_bypass_code'] as string[],
        })
        // Extract values from the results
        bypassPhone = configs.find(config => config.key === 'otp_bypass_phone')?.value || null
        bypassOtp = configs.find(config => config.key === 'otp_bypass_code')?.value || null
      } catch (error) {
        console.log('Failed to load OTP bypass config, using defaults:', error)
      }
      
      if (phone === bypassPhone && otp === bypassOtp) {
        try {
          const bypassOtpResult = await bypassOtpValidation(
            phone,
            otp,
            req,
            authModuleService
          )

          if (bypassOtpResult && bypassOtpResult?.authIdentity && bypassOtpResult?.authUserIdentity) {
            authIdentity = bypassOtpResult?.authIdentity
            authUserIdentity = bypassOtpResult?.authUserIdentity
          }
        } catch (error) {
          // If special case fails, fall through to normal flow
          console.log('Special case authentication failed, using normal flow:', error)
        }
      }
    }

    // Normal flow: validate OTP (if special case didn't succeed)
    if (!authIdentity || !authUserIdentity) {
      const result = await authModuleService.validateCallback("phone-auth", {
        body: { phone, otp, customer_id: customer?.id },
      })

      if (!result.success || !result.authIdentity) {
        return res.status(400).json({
          success: false,
          error: result.error || "Authentication failed",
        })
      }

      authUserIdentity = await authModuleService.retrieveAuthIdentity(
        result.authIdentity.id
      )

      authIdentity = result.authIdentity!
    }

    const { http } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig

    // Read agent_type from headers - it gets baked into the JWT token
    const agentType = getAgentType(req)

    const token = generateJwtTokenForAuthIdentity(
      {
        authIdentity: authUserIdentity,
        actorType: "customer", // domain: customer
        agent_type: agentType,
      },
      {
        secret: http.jwtSecret!,
        expiresIn: http.jwtExpiresIn || "24h",
        options: http.jwtOptions,
      }
    )
    res.setHeader("Authorization", `Bearer ${token}`)

    // Find customer's active cart (latest non-completed, non-deleted)
    let activeCartId: string | null = null
    
    if (customer?.id) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data: carts } = await query.graph({
        entity: "cart",
        fields: ["id"],
        filters: {
          customer_id: customer.id,
          deleted_at: null,
          completed_at: null,
        },
        pagination: { take: 1, order: { created_at: "desc" } },
      })

      activeCartId = carts?.[0]?.id ?? null

      if (is_new_user) {
        const eventBus = req.scope.resolve(Modules.EVENT_BUS)
        await eventBus.emit({
          name: CustomerWorkflowEvents.CREATED_ACCOUNT,
          data: { id: customer.id },
        })
      }
    }

    return res.json({
      success: true,
      user: {
        id: authIdentity.id,
        customer_id: customer?.id || null,
        active_cart_id: activeCartId,
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return res.status(500).json({
      success: false,
      error: message,
    })
  }
}

/**
 * Special case authentication bypass 
 */
const bypassOtpValidation = async (
  phone: string,
  otp: string,
  req: AuthenticatedMedusaRequest,
  authModuleService: IAuthModuleService
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: authIdentities } = await query.graph({
    entity: "auth_identity",
    fields: ["id"],
    filters: {
      provider_identities: {
        entity_id: phone,
        provider: "phone-auth"
      }
    },
    pagination: { take: 1 }
  })

  if (!authIdentities || authIdentities.length === 0) {
    throw new Error("Auth identity not found. Please call the auth route first to register.")
  }

  const authIdentity = { id: authIdentities[0].id } as { id: string }

  const authUserIdentity = await authModuleService.retrieveAuthIdentity(
    authIdentity.id
  )

  if (!authUserIdentity) {
    throw new Error("Failed to retrieve authentication identity")
  }

  return { authIdentity, authUserIdentity }
}