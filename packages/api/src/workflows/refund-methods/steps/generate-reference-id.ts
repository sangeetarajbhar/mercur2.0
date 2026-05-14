import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { randomUUID } from 'crypto';

/**
 * Step to generate unique reference ID for tracking
 */
export const generateReferenceIdStep = createStep(
  "generate-reference-id-step",
  async () => {
    const uuid = randomUUID().substring(0, 8);

    return new StepResponse(uuid);
  }
);
