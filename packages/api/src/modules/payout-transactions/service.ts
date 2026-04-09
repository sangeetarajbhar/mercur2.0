import { MedusaService } from "@medusajs/framework/utils"
import { PayoutTransactions } from "./models/payout_transactions"

class PayoutTransactionModuleService extends MedusaService({
  PayoutTransactions,
}) {}

export default PayoutTransactionModuleService
