import { useMemo, useState } from 'react'
import { Input, Button, toast, Switch, Label } from '@medusajs/ui'
import { useUpsertDefaultCommisionRule } from '../../../hooks/api/commission'
import { useStores } from '../../../hooks/api/stores'
import { AdminCommissionAggregate } from '../types'

type Props = {
  onSuccess?: () => void
  rule?: AdminCommissionAggregate
}

type Price = { amount: number; currency_code: string }

const UpsertDefaultCommissionRuleForm = ({ onSuccess, rule }: Props) => {
  const [rateType, setRateType] = useState(rule?.type ?? 'flat')
  const [ratePercentValue, setRatePercentValue] = useState(Number(rule?.percentage_rate) || 0)
  const [includeTax, setIncludeTax] = useState(rule?.include_tax ?? false)
  const [minCommissionEnabled, setMinCommissionEnabled] = useState(!!rule?.min_price_set)
  const [maxCommissionEnabled, setMaxCommissionEnabled] = useState(!!rule?.max_price_set)
  const [minCommission, setMinCommission] = useState<Price[]>(rule?.min_price_set ?? [])
  const [maxCommission, setMaxCommission] = useState<Price[]>(rule?.max_price_set ?? [])
  const [rateFlatValue, setRateFlatValue] = useState<Price[]>(rule?.price_set ?? [])
  const [loading, setLoading] = useState(false)

  const { mutateAsync: upsertCommissionRule } = useUpsertDefaultCommisionRule({})

  const { data: storesData } = useStores()

  const currencies = useMemo(
    () => (storesData?.stores[0]?.supported_currencies ?? []).map((c) => c.currency_code),
    [storesData]
  )

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const rule_payload = {
        is_active: true,
        name: 'Default commission rule',
        rate: {
          type: rateType as 'flat' | 'percentage',
          percentage_rate: rateType === 'percentage' ? ratePercentValue : undefined,
          include_tax: includeTax,
          price_set: rateType === 'flat' ? rateFlatValue : undefined,
          min_price_set: minCommissionEnabled ? minCommission : undefined,
          max_price_set: maxCommissionEnabled ? maxCommission : undefined,
        },
      }

      await upsertCommissionRule(rule_payload)
      setLoading(false)
      toast.success('Updated!')
      onSuccess?.()
    } catch (e: unknown) {
      toast.error('Error!')
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <fieldset className="my-4">
        <div className="flex items-center gap-x-2">
          <Switch
            id="include_tax"
            checked={includeTax}
            onCheckedChange={(val) => setIncludeTax(val)}
          />
          <Label>Commission charged including tax</Label>
        </div>
      </fieldset>
      <fieldset className="my-4">
        <legend className="mb-2">Fee type</legend>
        <div className="flex items-center gap-x-2">
          <Label>Flat fee</Label>
          <Switch
            id="rate_type"
            checked={rateType === 'percentage'}
            onCheckedChange={(val) => setRateType(val ? 'percentage' : 'flat')}
          />
          <Label>Percentage</Label>
        </div>
      </fieldset>
      <fieldset className="my-4">
        <legend className="mb-2">Fee value</legend>
        {rateType === 'percentage' && (
          <Input
            name="rate_percent_value"
            type="number"
            value={ratePercentValue}
            onChange={(e) => setRatePercentValue(parseFloat(e.target.value))}
          />
        )}
        {rateType === 'flat' &&
          currencies.map((currency) => (
            <div key={currency}>
              <Label>{currency.toUpperCase()}</Label>
              <Input
                name={`rate_flat_val_${currency}`}
                type="number"
                value={rateFlatValue.find((v) => v.currency_code === currency)?.amount ?? 0}
                onChange={(e) =>
                  setRateFlatValue((prev) => [
                    ...prev.filter((v) => v.currency_code !== currency),
                    { currency_code: currency, amount: parseFloat(e.target.value) },
                  ])
                }
              />
            </div>
          ))}
      </fieldset>
      {rateType === 'percentage' && (
        <>
          <fieldset className="my-4">
            <div className="flex items-center gap-x-2">
              <Label>Minimum commission value</Label>
              <Switch
                id="min_com"
                checked={minCommissionEnabled}
                onCheckedChange={(val) => setMinCommissionEnabled(val)}
              />
            </div>
            {minCommissionEnabled &&
              currencies.map((currency) => (
                <div key={currency}>
                  <Label>{currency.toUpperCase()}</Label>
                  <Input
                    name={`min_com_val_${currency}`}
                    type="number"
                    value={minCommission.find((v) => v.currency_code === currency)?.amount ?? 0}
                    onChange={(e) =>
                      setMinCommission((prev) => [
                        ...prev.filter((v) => v.currency_code !== currency),
                        { currency_code: currency, amount: parseFloat(e.target.value) },
                      ])
                    }
                  />
                </div>
              ))}
          </fieldset>
          <fieldset className="my-4">
            <div className="flex items-center gap-x-2">
              <Label>Maximum commission value</Label>
              <Switch
                id="max_com"
                checked={maxCommissionEnabled}
                onCheckedChange={(val) => setMaxCommissionEnabled(val)}
              />
            </div>
            {maxCommissionEnabled &&
              currencies.map((currency) => (
                <div key={currency}>
                  <Label>{currency.toUpperCase()}</Label>
                  <Input
                    name={`max_com_val_${currency}`}
                    type="number"
                    value={maxCommission.find((v) => v.currency_code === currency)?.amount ?? 0}
                    onChange={(e) =>
                      setMaxCommission((prev) => [
                        ...prev.filter((v) => v.currency_code !== currency),
                        { currency_code: currency, amount: parseFloat(e.target.value) },
                      ])
                    }
                  />
                </div>
              ))}
          </fieldset>
        </>
      )}
      <Button type="submit" isLoading={loading}>
        Save
      </Button>
    </form>
  )
}

export default UpsertDefaultCommissionRuleForm
