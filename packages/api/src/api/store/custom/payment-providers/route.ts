import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString
} from '@medusajs/framework/utils'
import { HttpTypes } from '@medusajs/framework/types'

import SystemConfigModuleService from "../../../../modules/system-config/service";
import { SYSTEM_CONFIG_SECTION_MODULE } from "../../../../modules/system-config";

import {
  COD_PAYMENT_PROVIDER,
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_PROVIDER_LABELS_DESCRIPTION,
  RAZORPAY_PAYMENT_PROVIDER
} from '../../../../utils/constants/payments'
import { constructS3Url } from '../../../../shared/utils/common'
import { PAY_ON_DELIVERY_ICON_KEY, PAY_ONLINE_ICON_KEY } from '../../../../utils/constants/icon_keys'

/**
 * Get payment provider configuration from environment variables
 * @param providerId - The payment provider ID
 * @returns Array of config objects with key-value pairs
 */
const getPaymentProviderConfigFromEnv = (providerId: string) => {
  // Handle Razorpay provider
  if (providerId === 'pp_razorpay_razorpay') {
    const keyId = process.env.RAZORPAY_TEST_KEY_ID ?? process.env.RAZORPAY_ID

    if (keyId) {
      return [
        {
          key: "key_id",
          value: keyId
        }
      ]
    }
  }

  // For other providers or if no config exists, return empty array
  return []
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<HttpTypes.StorePaymentProviderListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  // Step 1: Fetch all regions
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code"],
    filters:{currency_code: ['inr']}
  })

  if (!regions || !regions.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No regions found with currency INR"
    )
  }

  // Step 2: Use the first region's ID
  const regionId = regions[0].id

  // Step 3: Fetch payment providers for that region
  const paymentProviderQueryObject = remoteQueryObjectFromString({
    entryPoint: "region_payment_provider",
    variables: {
      filters: { region_id: regionId },
      ...req.queryConfig.pagination,
    },
    fields: req.queryConfig.fields.map((f) => `payment_provider.${f}`),
  })

  const systemConfigModuleService: SystemConfigModuleService = req.scope.resolve(SYSTEM_CONFIG_SECTION_MODULE)

  // Fetch both icons at once using an array of keys
  const [icons] = await systemConfigModuleService.listAndCountSystemConfigs({
    key: [PAY_ON_DELIVERY_ICON_KEY, PAY_ONLINE_ICON_KEY] as any,
  })

  // Create a map for easy lookup and construct full URLs from paths
  const iconMap = new Map(
    icons.map((icon: any) => [
      icon.key,
      icon.value ? constructS3Url(icon.value) : null
    ])
  )
  const payOnDeliveryIcon = iconMap.get(PAY_ON_DELIVERY_ICON_KEY)
  const payOnlineIcon = iconMap.get(PAY_ONLINE_ICON_KEY)

  const { rows: regionPaymentProvidersRelation, metadata } = await remoteQuery(
    paymentProviderQueryObject
  )
  const paymentProviders = regionPaymentProvidersRelation.map(
   (relation) => {
      let label = ''
      let description = ''
      let icon: string | null = null
      if (relation.payment_provider) {
        if (relation.payment_provider.id === COD_PAYMENT_PROVIDER) {
          label = PAYMENT_PROVIDER_LABELS[COD_PAYMENT_PROVIDER]
          description = PAYMENT_PROVIDER_LABELS_DESCRIPTION[COD_PAYMENT_PROVIDER]
          icon = payOnDeliveryIcon || null
        } else {
          label = PAYMENT_PROVIDER_LABELS[RAZORPAY_PAYMENT_PROVIDER]
          description = PAYMENT_PROVIDER_LABELS_DESCRIPTION[RAZORPAY_PAYMENT_PROVIDER]
          icon = payOnlineIcon || null
        }
      }
      return {
        ...relation.payment_provider,
        label: label,
        description: description,
        icon: icon
      }
    }
  )

  // Step 4: Get configs from environment variables for each payment provider
  const paymentProvidersWithConfigs = paymentProviders.map((provider: any) => {
    const configs = getPaymentProviderConfigFromEnv(provider.id)

    return {
      ...provider,
      configs
    }
  })

  res.json({
    payment_providers: paymentProvidersWithConfigs,
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}
