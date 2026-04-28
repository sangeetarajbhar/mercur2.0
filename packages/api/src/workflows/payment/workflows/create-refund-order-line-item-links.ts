import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import refundOrderLineItem from "../../../links/refund-order-line-item";

type WorkflowInput = {
  payment_id: string;
  order_line_item_id: string;
  refunds?: any[];
  amount: number;
};

type StepOutput = {
  success: boolean;
  message: string;
  created_links: number;
};

// Step 1: Fetch refunds and find the one matching the amount
const fetchRefundsStep = createStep(
  "fetch-refunds-step",
  async ({ payment_id, refunds, amount }: { payment_id: string; refunds?: any[]; amount: number }, { container }) => {
    const paymentModuleService = container.resolve(Modules.PAYMENT);
    
    // If no refunds provided, fetch all refunds for this payment
    if (!refunds || refunds.length === 0) {
      refunds = await paymentModuleService.listRefunds({
        payment_id
      });
    }

    // Find the refund that matches the exact amount
    const matchingRefund = refunds.find((refund: any) => {
      const refundAmount = typeof refund === 'object' ? refund.amount : null;
      return refundAmount !== null && refundAmount === amount;
    });

    if (!matchingRefund) {
      throw new Error(`No refund found with amount ${amount} for payment ${payment_id}`);
    }

    // Return only the matching refund ID
    const refundId = typeof matchingRefund === 'object' ? matchingRefund.id : matchingRefund;

    return new StepResponse({ refundId });
  }
);

// Step 2: Check if the refund is already linked to this order_line_item_id
const queryExistingLinksStep = createStep(
  "query-existing-links-step",
  async (
    { refundId, order_line_item_id }: { refundId: string; order_line_item_id: string },
    { container }
  ) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    // Query existing links for this specific refund and order line item
    const { data: existingLinks } = await query.graph({
      entity: refundOrderLineItem.entryPoint,
      fields: ['refund_id', 'order_line_item_id'],
      filters: {
        refund_id: refundId,
        order_line_item_id: order_line_item_id
      }
    });

    // Check if a link already exists
    const isAlreadyLinked = existingLinks.length > 0;

    return new StepResponse({
      isAlreadyLinked,
      refundId
    });
  }
);

// Step 3: Create link if not already linked
const createLinksStep = createStep(
  "create-links-step",
  async (
    { isAlreadyLinked, refundId, order_line_item_id }: { isAlreadyLinked: boolean; refundId: string; order_line_item_id: string },
    { container }
  ) => {
    const link = container.resolve(ContainerRegistrationKeys.LINK);

    let createdLinks = 0;

    // Create link only if not already linked
    if (!isAlreadyLinked) {
      const linkToCreate = {
        [Modules.PAYMENT]: { refund_id: refundId },
        [Modules.ORDER]: { order_line_item_id }
      };

      await link.create([linkToCreate]);
      createdLinks = 1;
    }

    return new StepResponse({ createdLinks });
  }
);

// Compose the workflow
export const createRefundOrderLineItemLinksWorkflow = createWorkflow(
  "create-refund-order-line-item-links",
  ({ payment_id, order_line_item_id, refunds, amount }: WorkflowInput) => {
    // Step 1: Fetch refunds and find the one matching the amount
    const { refundId } = fetchRefundsStep({ payment_id, refunds, amount });

    // Step 2: Check if already linked
    const { isAlreadyLinked } = queryExistingLinksStep({
      refundId,
      order_line_item_id
    });

    // Step 3: Create link if not already linked
    const { createdLinks } = createLinksStep({
      isAlreadyLinked,
      refundId,
      order_line_item_id
    });

    return new WorkflowResponse({
      success: true,
      created_links: createdLinks
    });
  }
);

