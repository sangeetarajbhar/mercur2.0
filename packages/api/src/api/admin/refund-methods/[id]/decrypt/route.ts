import { 
  AuthenticatedMedusaRequest, 
  MedusaResponse 
} from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { CUSTOMER_REFUND_METHODS_MODULE } from "../../../../../modules/customer_refund_methods";
import CustomerRefundMethodModuleService from "../../../../../modules/customer_refund_methods/service";

/**
 * @oas [get] /admin/refund-methods/{id}/decrypt
 * operationId: "AdminDecryptRefundMethod"
 * summary: "Decrypt Refund Method"
 * description: "Decrypt sensitive refund method data for admin use (e.g., processing payouts). WARNING: Only use for legitimate business purposes."
 * x-authenticated: true
 * parameters:
 *   - name: id
 *     in: path
 *     schema:
 *       type: string
 *     required: true
 *     description: "The ID of the refund method to decrypt"
 * responses:
 *   "200":
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             refund_method:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 customer_id:
 *                   type: string
 *                 order_id:
 *                   type: string
 *                 return_id:
 *                   type: string
 *                 type:
 *                   type: string
 *                   enum: [bank, upi]
 *                 account_number:
 *                   type: string
 *                   description: "Decrypted account number (bank type only)"
 *                 account_holder_name:
 *                   type: string
 *                   description: "Decrypted account holder name (bank type only)"
 *                 ifsc_code:
 *                   type: string
 *                   description: "IFSC code (bank type only)"
 *                 upi_id:
 *                   type: string
 *                   description: "Decrypted UPI ID (upi type only)"
 *                 is_default:
 *                   type: boolean
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *   "401":
 *     description: Unauthorized
 *   "404":
 *     description: Refund method not found
 * tags:
 *   - Admin
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerRefundMethodService = req.scope.resolve<CustomerRefundMethodModuleService>(CUSTOMER_REFUND_METHODS_MODULE);
  const refundMethodId = req.params.id;

  try {
    // WARNING: This returns decrypted sensitive data
    // Only use for legitimate business purposes like processing payouts
    const decryptedMethod = await customerRefundMethodService.decryptRefundMethod(refundMethodId);

    res.json({ refund_method: decryptedMethod });
  } catch (error: any) {
    if (error.message === 'Refund method not found') {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Refund method not found"
      );
    }
    if (error.message === 'Refund method has been deleted') {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Refund method has been deleted"
      );
    }
    throw error;
  }
}
