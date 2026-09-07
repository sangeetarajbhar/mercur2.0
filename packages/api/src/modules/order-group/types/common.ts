import {
    BigNumberInput,
    CartDTO,
    CustomerDTO,
    FulfillmentStatus,
    OrderDTO,
    OrderDetailDTO,
    OrderStatus,
    PaymentCollectionDTO,
    PaymentCollectionStatus,
    SalesChannelDTO
  } from '@medusajs/framework/types'

export type OrderGroupDTO = {
    id: string
    display_id: number
    customer_id: string | null
    cart_id: string
    created_at: Date
    updated_at: Date
    customer?: CustomerDTO
    cart?: CartDTO
    sales_channel_id?: string
    sales_channel?: SalesChannelDTO
    payment_collection_id?: string
    payment_collection?: PaymentCollectionDTO
    seller_count?: number
    total?: number
    deleted_at?: Date | null
  }

  export type OrderGroupWithOrdersDTO = OrderGroupDTO & {
    orders: (OrderDTO & OrderDetailDTO)[]
  }
  
export type FormattedOrderGroupDTO = Omit<OrderGroupDTO, 'total'> & {
    ui_order_set_id: string
    orders: (OrderDTO & OrderDetailDTO)[]
    status: OrderStatus
    payment_status: PaymentCollectionStatus
    fulfillment_status: FulfillmentStatus
    total: BigNumberInput
    tax_total: BigNumberInput
    subtotal: BigNumberInput
    shipping_total: BigNumberInput
    shipping_tax_total: BigNumberInput
    metadata?: Record<string, unknown> | null
    rider_assigned_at?: Date | null
  }
  