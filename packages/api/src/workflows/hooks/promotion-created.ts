import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { 
  createCustomFromPromotionWorkflow, 
  CreateCustomFromPromotionWorkflowInput,
} from "../promotions/workflows"

createPromotionsWorkflow.hooks.promotionsCreated(
	async ({ promotions, additional_data }, { container }) => {
    const workflow = createCustomFromPromotionWorkflow(container)
    console.log("Running createCustomFromPromotionWorkflow for promotions HOOK:", promotions)
    console.log("Additional data for promotions HOOK:", additional_data)
    
    for (const promotion of promotions) {
      await workflow.run({
        input: {
          promotion,
          additional_data,
        } as CreateCustomFromPromotionWorkflowInput,
      })
    }
	}
)

