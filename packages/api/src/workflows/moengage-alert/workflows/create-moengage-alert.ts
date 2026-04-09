import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {createMoengageAlertStep} from "../steps";
import {CreateMoengageAlertInput} from "../type/mutation";

export const createMoengageAlertWorkflow = createWorkflow(
  "create-moengage-alert",
  (input: CreateMoengageAlertInput) => {
    const moengageAlert = createMoengageAlertStep(input)

    return new WorkflowResponse(moengageAlert)
  }
)
