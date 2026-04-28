export const SplitOrderPaymentWorkflowEvents = {
    REFUND_COMPLETED: 'split_order_payment.refund.completed'
  } as const
  
  export type SplitOrderPaymentWorkflowEvent =
    (typeof SplitOrderPaymentWorkflowEvents)[keyof typeof SplitOrderPaymentWorkflowEvents]
  