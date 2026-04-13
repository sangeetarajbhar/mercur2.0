import { Module } from "@medusajs/framework/utils"
import PayoutTransactionModuleService from "./service"

export const PAYOUT_TRANSACTIONS_MODULE = "payout_transactions"

export default Module(PAYOUT_TRANSACTIONS_MODULE, {
  service: PayoutTransactionModuleService,
})
