import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { initRazorpayClient } from '../../../modules/customer_refund_methods/utils/razorpay-validation'

/**
 * Step to generate unique reference ID for tracking
 */
export const initializeRazorpayClientStep = createStep(
  "initialize-razorpay-client-step",
  async () => {
    const client = initRazorpayClient()

    return new StepResponse({ client })
  }
);
