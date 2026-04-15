import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys, CustomerWorkflowEvents as CoreCustomerWorkflowEvents } from '@medusajs/framework/utils'
import { MoEngageAlertName } from '../shared/utils/moEngageAlertName'
import { createMoEngageNotificationService } from '../shared/services/moengage-notification.service'

export const CustomerWorkflowEvents = {
  ...CoreCustomerWorkflowEvents,
  CREATED_ACCOUNT: 'customer.created_account',
} as const


export default async function buyerAccountCreatedHandler({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const moEngageService = createMoEngageNotificationService(container)
  
  const {
    data: [customer]
  } = await query.graph({
    entity: 'customer',
    fields: ['id', 'email', 'first_name', 'last_name', 'phone'],
    filters: {
      id: event.data.id
    }
  })

  if (!customer) {
    console.error('Customer not found:', event.data.id)
    return
  }

  // Send MoEngage notifications (SMS, WhatsApp, Email, Push) based on configuration
  moEngageService.sendNotifications({
    alertName: MoEngageAlertName.ACCOUNT_CREATED,
    recipient: {
      phone: customer.phone || undefined,
      email: customer.email || undefined,
      deviceTokenId: customer.phone || undefined,
    },
    data: {
      customer_name: customer.first_name || '',
    }
  })
}
export const config: SubscriberConfig = {
  // event: CustomerWorkflowEvents.CREATED,
  event: CustomerWorkflowEvents.CREATED_ACCOUNT,
  context: {
    subscriberId: 'buyer-account-created-handler'
  }
}
