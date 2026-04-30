import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

type ValidateOrderReturnableInput = {
  order_id: string;
  items?: Array<{
    id: string;
    quantity: number;
  }>;
};

/**
 * Step to validate if an order can be returned based on returnable_flag and return_end_date
 */
export const validateOrderReturnableStep = createStep(
  "validate-order-returnable",
  async (input: ValidateOrderReturnableInput, { container }): Promise<StepResponse<void>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    // Check if items array exists and has at least one item
    if (!input.items || input.items.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No line items provided for return validation"
      );
    }

    const lineItemId = input.items[0].id;

    // Validate that the order exists and contains the line item
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["id", "items.id"],
      filters: {
        id: input.order_id,
      },
    });

    if (!order) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Order with id ${input.order_id} not found`
      );
    }

    // Verify that the line item belongs to this order
    const lineItemExists = order.items?.some((item: any) => item.id === lineItemId);
    
    if (!lineItemExists) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Line item with id ${lineItemId} does not belong to order ${input.order_id}`
      );
    }

    // Query order_line_item_extension for the single line item
    const { data: lineItemExtensions } = await query.graph({
      entity: "order_line_item_extension",
      fields: [
        "id",
        "order_line_item_id",
        "returnable_flag",
        "return_end_date",
      ],
      filters: {
        order_line_item_id: lineItemId,
      },
    });

    if (!lineItemExtensions || lineItemExtensions.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Order line item extension data not found. Cannot validate return eligibility."
      );
    }

    const extension = lineItemExtensions[0];

    // Check returnable_flag
    if (!extension.returnable_flag) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "The order cannot be returned. This item is marked as non-returnable."
      );
    }

    if(!extension.return_end_date){
        throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            "The order cannot be returned before the return window has been set."
        );
    } else {
      const currentDate = new Date();
      const returnEndDate = new Date(extension.return_end_date);
      
      if (currentDate > returnEndDate) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "The order cannot be returned. The return window has expired."
        );
      }
    }

    // All validations passed
    return new StepResponse(undefined);
  }
);

/**
 * Workflow to validate if an order can be returned
 */
export const validateOrderReturnableWorkflow = createWorkflow(
  "validate-order-returnable-workflow",
  (input: ValidateOrderReturnableInput) => {
    validateOrderReturnableStep(input);
    
    return new WorkflowResponse({
      success: true,
      message: "Order is eligible for return",
    });
  }
);

