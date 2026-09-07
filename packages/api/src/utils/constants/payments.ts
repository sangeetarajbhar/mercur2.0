export const RAZORPAY_PAYMENT_PROVIDER = "pp_razorpay_razorpay"

export enum RAZORPAY_PAYOUT_MODE {
  UPI = "UPI",
  IMPS = "IMPS",
}

export enum PaymentMethod {
  COD = 'COD',
  PREPAID = 'PREPAID',
}
export const COD_PAYMENT_PROVIDER = 'pp_system_default';

export const PAYMENT_METHOD_COD = 'COD';
export const PAYMENT_METHOD_PREPAID = 'PREPAID';

export const getPaymentMethod = (providerId: string) => {
  if (providerId === COD_PAYMENT_PROVIDER) {
    return PaymentMethod.COD;
  }
  return PaymentMethod.PREPAID;
}

export enum MEDUSA_PAYMENT_STATUS {
  NOT_PAID = 'not_paid',
  CANCELED = 'canceled',
}

export const MEDUSA_PAYMENT_STATUS_DISPLAY: Record<string, string> = {
  [MEDUSA_PAYMENT_STATUS.NOT_PAID]: 'Payment failed',
  [MEDUSA_PAYMENT_STATUS.CANCELED]: 'Payment rejected',
};

export const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  [COD_PAYMENT_PROVIDER]: 'Pay on Delivery',
  [RAZORPAY_PAYMENT_PROVIDER]: 'Pay Online'
}

export const PAYMENT_PROVIDER_LABELS_DESCRIPTION: Record<string, string> = {
  [COD_PAYMENT_PROVIDER]: '(Cash, UPI)',
  [RAZORPAY_PAYMENT_PROVIDER]: '(UPI, Credit Card, Wallets, etc)'
}

