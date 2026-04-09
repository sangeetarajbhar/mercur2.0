import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { uploadToS3WithPath, constructS3Url } from "../../../shared/utils/common"
import { SYSTEM_CONFIG_SECTION_MODULE } from "../../../modules/system-config"
import SystemConfigModuleService from "../../../modules/system-config/service"
import { AdminSaveIconType } from "./validators"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const file = (req as AuthenticatedMedusaRequest & {
    file?: { buffer: Buffer; originalname?: string; mimetype?: string }
  }).file

  const keyname = (req.body as AdminSaveIconType)?.keyname as string

  if (!file) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "No icon file uploaded")
  }

  if (!keyname || keyname.trim() === "") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "Keyname is required")
  }

  try {
    const fileExtension = file.originalname?.split(".").pop() || "png"
    const sanitizedKeyname = keyname.replace(/[^a-zA-Z0-9_-]/g, "_")
    const fileNameWithPath = `icons/${sanitizedKeyname}.${fileExtension}`

    await uploadToS3WithPath(
      fileNameWithPath,
      file.buffer,
      file.mimetype || "image/png"
    )

    const systemConfigModuleService: SystemConfigModuleService =
      req.scope.resolve(SYSTEM_CONFIG_SECTION_MODULE)

    const [existingConfigs] = await systemConfigModuleService.listAndCountSystemConfigs({
      key: keyname,
    } as any)

    let systemConfigIcon: any

    if (existingConfigs && existingConfigs.length > 0) {
      const existingConfig = existingConfigs[0]
      systemConfigIcon = await systemConfigModuleService.updateSystemConfigs([
        {
          id: existingConfig.id,
          value: fileNameWithPath,
        },
      ] as any)
    } else {
      systemConfigIcon = await systemConfigModuleService.createSystemConfigs([
        {
          key: keyname,
          value: fileNameWithPath,
        },
      ] as any)
    }

    const fileUrl = constructS3Url(fileNameWithPath)

    res.json({
      icon: {
        ...systemConfigIcon[0],
        url: fileUrl,
        file_path: fileNameWithPath,
      },
    })
  } catch (error) {
    console.error("Error saving icon:", error)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Failed to save icon: ${(error as Error).message}`
    )
  }
}

