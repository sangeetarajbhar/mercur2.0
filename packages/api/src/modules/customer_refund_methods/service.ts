import { MedusaService } from "@medusajs/framework/utils"
import { customerRefundMethod } from "./models/customer_refund_method"
import { decryptFromStorage } from "../../utils/encryption"

class CustomerRefundMethodModuleService extends MedusaService({
  customerRefundMethod,
}) {
  async decryptRefundMethod(refundMethodId: string) {
    const refundMethod = await this.retrieveCustomerRefundMethod(refundMethodId)
    if (!refundMethod) throw new Error("Refund method not found")
    return this.decryptMethod(refundMethod as Record<string, any>)
  }

  async getCustomerRefundMethodsDecrypted(customerId: string, status: boolean) {
    const methods = await this.listCustomerRefundMethods({
      customer_id: customerId,
      deleted_at: null,
      status,
    })
    return methods.map((m: any) => this.decryptMethod(m))
  }

  private decryptMethod(method: Record<string, any>) {
    const base: Record<string, any> = {
      id: method.id,
      customer_id: method.customer_id,
      order_id: method.order_id,
      return_id: method.return_id,
      type: method.type,
      is_default: method.is_default,
      created_at: method.created_at,
      updated_at: method.updated_at,
      is_account_verified: method.is_account_verified,
      status: method.status,
      masked_account: method.masked_account,
      masked_holder: method.masked_holder,
      masked_upi: method.masked_upi,
      ifsc_code: method.ifsc_code,
    }

    if (method.type === "bank") {
      if (method.account_number_enc) base.account_number = decryptFromStorage(method.account_number_enc)
      if (method.account_holder_enc)
        base.account_holder_name = decryptFromStorage(method.account_holder_enc)
    } else if (method.type === "upi") {
      if (method.upi_id_enc) base.upi_id = decryptFromStorage(method.upi_id_enc)
    }
    return base
  }
}

export default CustomerRefundMethodModuleService
