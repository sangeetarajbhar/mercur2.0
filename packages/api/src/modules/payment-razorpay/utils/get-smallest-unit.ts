import { BigNumberInput } from "@medusajs/framework/types"
import { BigNumber, MathBN } from "@medusajs/framework/utils"

function getCurrencyMultiplier(currency): number {
  const currencyMultipliers = {
    0: [
      "BIF",
      "CLP",
      "DJF",
      "GNF",
      "JPY",
      "KMF",
      "KRW",
      "MGA",
      "PYG",
      "RWF",
      "UGX",
      "VND",
      "VUV",
      "XAF",
      "XOF",
      "XPF",
    ],
    3: ["BHD", "IQD", "JOD", "KWD", "OMR", "TND"],
  }

  currency = currency.toUpperCase()
  let power = 2
  for (const [key, value] of Object.entries(currencyMultipliers)) {
    if ((value as string[]).includes(currency)) {
      power = parseInt(key, 10)
      break
    }
  }
  return Math.pow(10, power)
}

/**
 * Converts an amount to the smallest currency unit (NO ROUNDING).
 */
export function getSmallestUnit(amount: BigNumberInput, currency: string): number {
  const multiplier = getCurrencyMultiplier(currency)

  // Direct multiply → do NOT round
  const smallestAmount = new BigNumber(MathBN.mult(amount, multiplier))
  let numeric = smallestAmount.numeric

  // For 3-decimal currencies (JOD/KWD/etc.), round UP to nearest 10
  if (multiplier === 1e3) {
    numeric = Math.ceil(numeric / 10) * 10
  }

  return parseInt(numeric.toString().split(".")[0], 10)
}

/**
 * Converts smallest unit → normal amount.
 */
export function getAmountFromSmallestUnit(amount: BigNumberInput, currency: string): number {
  const multiplier = getCurrencyMultiplier(currency)
  const standardAmount = new BigNumber(MathBN.div(amount, multiplier))
  return standardAmount.numeric
}

