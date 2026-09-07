import { Module } from '@medusajs/framework/utils'

import ControlModuleService from './service'

export const CONTROLS_MODULE = 'controls'

export default Module(CONTROLS_MODULE, {
  service: ControlModuleService
})
