import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import  {OrderSetWorkflowEvents}  from '../../modules/marketplace/types/event'
import {
  sendCustomerAnalytics,
  type CustomerAnalyticsPayload
} from '../utils/customer-analytics'

export default async function analyticsCustomerSubscriber({
  event,
  container
}: SubscriberArgs<{ id: string }>) {
  const orderSetId = event.data?.id
  if (!orderSetId) {
    console.warn('[analytics-customer] Missing id in event data')
    return
  }

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [orderSet]
    } = await query.graph({
      entity: 'order_set',
      fields: ['customer_id'],
      filters: { id: orderSetId }
    })

    if (!orderSet) {
      console.warn('[analytics-customer] Order set not found:', orderSetId)
      return
    }

    const customerId = (orderSet as { customer_id?: string }).customer_id
    if (!customerId) {
      console.warn('[analytics-customer] Customer ID not found in order set:', orderSetId)
      return
    }

    const {
      data: [customer]
    } = await query.graph({
      entity: 'customer',
      fields: [
        'id',
        'phone',
        'email',
        'first_name',
        'last_name',
        'customer_details.gender'
      ],
      filters: { id: customerId }
    })

    if (!customer) {
      console.warn('[analytics-customer] Customer not found:', customerId)
      return
    }

    const userId = customer.phone ? `+91${customer.phone}` : null
    if (!userId) {
      console.warn('[analytics-customer] Customer phone not found, skipping:', orderSetId)
      return
    }

    const { data: firstOrders } = await query.graph({
      entity: 'order',
      fields: ['created_at'],
      filters: { customer_id: customer.id },
      pagination: {
        take: 1,
        order: { created_at: 'ASC' }
      }
    })

    const { data: lastOrders } = await query.graph({
      entity: 'order',
      fields: ['created_at'],
      filters: { customer_id: customer.id },
      pagination: {
        take: 1,
        order: { created_at: 'DESC' }
      }
    })

    const cust = customer as { customer_details?: { gender?: string } }
    const userFirstOrderDate = firstOrders?.[0]?.created_at
      ? new Date((firstOrders[0] as { created_at: string }).created_at).toISOString()
      : undefined
    const userLastPurchaseDate = lastOrders?.[0]?.created_at
      ? new Date((lastOrders[0] as { created_at: string }).created_at).toISOString()
      : undefined

    const payload: CustomerAnalyticsPayload = {
      userId,
      context: {
        traits: {
          userId,
          email: customer.email ?? undefined,
          phone: userId,
          mobile: userId,
          first_name: customer.first_name ?? undefined,
          last_name: customer.last_name ?? undefined,
          gender: cust.customer_details?.gender ?? undefined,
          user_first_order_date: userFirstOrderDate,
          user_last_purchase_date: userLastPurchaseDate
        },
        library: {
          name: 'http'
        }
      },
      timestamp: new Date().toISOString()
    }
    // console.log('customer payload-------->',payload)
    await sendCustomerAnalytics(payload, 'analytics-customer')
  } catch (error) {
    console.error('Error in analyticsCustomerSubscriber:', error)
    throw error
  }
}

export const config: SubscriberConfig = {
  event: OrderSetWorkflowEvents.PLACED,
  context: {
    subscriberId: 'analytics-customer-handler'
  }
}
