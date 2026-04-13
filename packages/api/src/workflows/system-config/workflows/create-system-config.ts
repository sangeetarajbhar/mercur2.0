import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { CreateSystemConfigInput } from "../../system-config/type/mutation"
import { createSystemConfigStep } from "../steps/create-system-config"

export const createSystemConfigWorkflow = createWorkflow(
  "create-system-config",
  (input: CreateSystemConfigInput) => {
    const systemConfig = createSystemConfigStep(input)
    return new WorkflowResponse(systemConfig)
  }
)

