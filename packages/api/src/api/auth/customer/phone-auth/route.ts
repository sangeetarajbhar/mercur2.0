import { container, MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createCustomerAccountWorkflow } from '@medusajs/medusa/core-flows'

import { MoEngageChannels } from '../../../../modules/moengage/types/channels'
import { MoEngageAlertName } from '../../../../shared/utils/moEngageAlertName'
import { AuthenticationResponse, FilterableCustomerProps, IAuthModuleService, ICustomerModuleService } from '@mercurjs/types'

// Extend the FilterableCustomerProps type to include phone
type ExtendedFilterableCustomerProps = FilterableCustomerProps & {
  phone?: string
}

// Handle unsupported HTTP methods
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  return res.status(405).json({
    success: false,
    error: 'Method Not Allowed',
    message: 'GET method is not supported for this endpoint. Use POST instead.'
  })
}

// export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
//   return res.status(405).json({
//     success: false,
//     error: 'Method Not Allowed',
//     message: 'PUT method is not supported for this endpoint. Use POST instead.'
//   })
// }

// export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
//   return res.status(405).json({
//     success: false,
//     error: 'Method Not Allowed',
//     message: 'PATCH method is not supported for this endpoint. Use POST instead.'
//   })
// }

// export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
//   return res.status(405).json({
//     success: false,
//     error: 'Method Not Allowed',
//     message: 'DELETE method is not supported for this endpoint. Use POST instead.'
//   })
// }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  // Body is already validated and transformed by middleware
  // In IOS that hash won't be generated and there is no auto read for ios
  const { phone: normalizedPhone, hash_code = "gtX66zaes70" } = req.body as { phone: string; hash_code?: string }

  const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH)
  const customerModuleService: ICustomerModuleService = req.scope.resolve(
    Modules.CUSTOMER
  )
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const moengageAlert = await knex('moengage_alert')
    .select('id', 'alert_id', 'alert_name', 'is_sms', 'sms_attributes', 'is_whatsapp', 'whatsapp_attributes', 'is_email', 'email_attributes', 'is_push', 'push_attributes', 'status')
    .where('alert_name', MoEngageAlertName.LOGIN_OTP_WITH_HASH_CODE)
    .where('status', 1)
    .whereNull('deleted_at')
    .first()

  if (!moengageAlert || (moengageAlert.is_sms == false && moengageAlert.is_whatsapp == false && moengageAlert.is_email == false)) {
    return res.status(400).json({
      success: false,
      error: 'Unable to send OTP, please try again letter'
    })
  }

  try {
    // Check if customer exists before registration
    const existingCustomers = await customerModuleService.listCustomers({ phone: normalizedPhone, deleted_at: null } as ExtendedFilterableCustomerProps)
    const isNewUser = existingCustomers.length === 0

    // Ensure customer exists - create if needed
    if (isNewUser) {
      const registeredUser = await authModuleService.register('phone-auth', {
        body: { phone: normalizedPhone }
      })
      try {
        await createCustomerAccountWorkflow(req.scope).run({
          input: {
            authIdentityId: registeredUser.authIdentity!.id,
            customerData: {
              first_name: '',
              last_name: '',
              email: `${normalizedPhone}@gmail.com`,
              phone: normalizedPhone,
            }
          }
        })
      } catch (error) {
        console.log('error creating customer', error)
      }
    }

    const result = await authModuleService.authenticate('phone-auth', {
      body: { phone: normalizedPhone }
    }) as AuthenticationResponse & { otp?: string }

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Authentication failed'
      })
    }

    const appendCountryCodeWithPhone = '91' + normalizedPhone
    await notificationService.createNotifications({
      to: appendCountryCodeWithPhone,
      channel: MoEngageChannels.SMS,
      template: moengageAlert.alert_name,
      trigger_type: MoEngageAlertName.LOGIN_OTP_WITH_HASH_CODE,
      receiver_id: appendCountryCodeWithPhone,
      data: {
        alert_id: moengageAlert.alert_id,
        alert_reference_name: moengageAlert.alert_name,
        user_id: normalizedPhone, // user_id will always be the phone number
        data: {
          //personalized_attributes
          otp_code: result.otp,
          hash_code: hash_code,
        },
      }
    })

    return res.json({
      success: true,
      is_new_user: isNewUser,
      message: 'OTP sent successfully',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
