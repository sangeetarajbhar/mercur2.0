import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import MoengageAlertModuleService from "../../../modules/moengage_alert/service";
import {MOENGAGE_ALERT_MODULE} from "../../../modules/moengage_alert";
import {CreateMoengageAlertInput} from "../../../workflows/moengage-alert/type/mutation";

export const createMoengageAlertStep = createStep(
  "create-moengage-alert-step",
  async (input: CreateMoengageAlertInput, { container }) => {
    const service = container.resolve<MoengageAlertModuleService>(
      MOENGAGE_ALERT_MODULE
    )

    const moengageAlert = await service.createMoengageAlerts(input)

    return new StepResponse(moengageAlert, moengageAlert.id)
  },
  async (id: string, { container }) => {
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Moengage alert ID is required for compensation'
      )
    }

    const service = container.resolve<MoengageAlertModuleService>(
      MOENGAGE_ALERT_MODULE
    )
    await service.softDeleteMoengageAlerts(id)
  }
)
