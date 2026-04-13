import { Module } from '@medusajs/framework/utils'

import MoengageAlertModuleService from './service'

export const MOENGAGE_ALERT_MODULE = 'moengage_alert'

export default Module(MOENGAGE_ALERT_MODULE, {
  service: MoengageAlertModuleService
})
