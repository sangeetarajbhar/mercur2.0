import { MedusaRequest, MedusaResponse } from "@medusajs/framework"

/**
 * @oas [post] /store/promotions/{promo_code}/eligibility
 * operationId: "CheckPromoCodeEligibility"
 * summary: "Check Promo Code Eligibility"
 * description: "Checks if a promo code is eligible. Always returns 200 status."
 * parameters:
 *   - (path) promo_code=* {string} The promo code to check
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         properties:
 *           promo_codes:
 *             type: array
 *             items:
 *               type: string
 *             description: Array of promo codes to check
 * responses:
 *   200:
 *     description: OK
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *             eligible:
 *               type: boolean
 *             promo_code:
 *               type: string
 *             message:
 *               type: string
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { promo_code } = req.params
  const body = req.body as { promo_codes?: string[] }
  const promo_codes = body.promo_codes || []

  // Always return 200 with success response
  return res.status(200).json({
    success: true,
    eligible: true,
    promo_code: promo_code,
    promo_codes: promo_codes,
    message: "Promo code is eligible"
  })
}

