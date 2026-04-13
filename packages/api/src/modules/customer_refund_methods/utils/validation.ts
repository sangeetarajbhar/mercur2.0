import { generateHmac } from "./encryption"

export function validateAccountNumber(accountNumber: string): boolean {
  if (!accountNumber) return false
  return /^[0-9]{6,20}$/.test(accountNumber.trim())
}

export function validateIfscCode(ifscCode: string): boolean {
  if (!ifscCode) return false
  return /^[A-Z]{4}0[0-9A-Z]{6}$/.test(ifscCode.trim().toUpperCase())
}

export function validateUpiId(upiId: string): boolean {
  if (!upiId) return false
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim())
}

export async function validateDuplicateRefundMethod(
  data: {
    customer_id: string
    type: "bank" | "upi"
    account_number?: string
    upi_id?: string
  },
  service: any
): Promise<{ isDuplicate: boolean; error?: string }> {
  try {
    if (data.type === "bank" && data.account_number) {
      const hmac = generateHmac(data.account_number)
      const existing = await service.listCustomerRefundMethods({
        customer_id: data.customer_id,
        account_number_hmac: hmac,
        deleted_at: null,
      })
      return { isDuplicate: existing.length > 0 }
    }

    if (data.type === "upi" && data.upi_id) {
      const hmac = generateHmac(data.upi_id)
      const existing = await service.listCustomerRefundMethods({
        customer_id: data.customer_id,
        upi_id_hmac: hmac,
        deleted_at: null,
      })
      return { isDuplicate: existing.length > 0 }
    }

    return { isDuplicate: false }
  } catch {
    return { isDuplicate: false, error: "Unable to check for duplicates at this time" }
  }
}

