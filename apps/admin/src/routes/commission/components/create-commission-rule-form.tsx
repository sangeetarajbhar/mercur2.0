import { useMemo, useState } from 'react'
import { Input, Button, Select, toast, Switch, Label } from '@medusajs/ui'

import { useSellers } from '../../../hooks/api/sellers'
import { useCreateCommisionRule } from '../../../hooks/api/commission'
import { useStores } from '../../../hooks/api/stores'
import { useProductTypes, useProductCategories } from '../../../hooks/api/products-catalog'

type Props = {
  onSuccess?: () => void
}

type Price = { amount: number; currency_code: string }

const CreateCommissionRuleForm = ({ onSuccess }: Props) => {
  const [name, setName] = useState('')
  const [reference, setReference] = useState('seller')
  const [rateType, setRateType] = useState('flat')
  const [ratePercentValue, setRatePercentValue] = useState(0)
  const [rateFlatValue, setRateFlatValue] = useState<Price[]>([])
  const [includeTax, setIncludeTax] = useState(false)
  const [minCommissionEnabled, setMinCommissionEnabled] = useState(false)
  const [maxCommissionEnabled, setMaxCommissionEnabled] = useState(false)
  const [minCommission, setMinCommission] = useState<Price[]>([])
  const [maxCommission, setMaxCommission] = useState<Price[]>([])
  const [loading, setLoading] = useState(false)

  const { product_types } = useProductTypes({ fields: 'id,value', limit: 9999 })
  const { product_categories } = useProductCategories({ fields: 'id,name', limit: 9999 })
  const { data: sellersData } = useSellers({ fields: 'id,name', limit: 9999 })
  const sellers = sellersData?.sellers ?? []

  const showSellers = useMemo(
    () => reference === 'seller' || reference === 'seller+product_type' || reference === 'seller+product_category',
    [reference]
  )
  const showProductTypes = useMemo(
    () => reference === 'product_type' || reference === 'seller+product_type',
    [reference]
  )
  const showProductCategories = useMemo(
    () => reference === 'product_category' || reference === 'seller+product_category',
    [reference]
  )

  const [seller, setSeller] = useState('')
  const [type, setType] = useState('')
  const [category, setCategory] = useState('')

  const { mutateAsync: createCommissionRule } = useCreateCommisionRule({})

  const { data: storesData } = useStores()

  const currencies = useMemo(
    () => (storesData?.stores[0]?.supported_currencies ?? []).map((c) => c.currency_code),
    [storesData]
  )

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      let reference_id = ''
      switch (reference) {
        case 'seller':
          reference_id = seller
          break
        case 'product_type':
          reference_id = type
          break
        case 'product_category':
          reference_id = category
          break
        case 'seller+product_type':
          reference_id = `${seller}+${type}`
          break
        case 'seller+product_category':
          reference_id = `${seller}+${category}`
          break
      }

      const rule_payload = {
        name,
        reference,
        reference_id,
        is_active: true,
        rate: {
          type: rateType as 'flat' | 'percentage',
          percentage_rate: rateType === 'percentage' ? ratePercentValue : undefined,
          include_tax: includeTax,
          price_set: rateType === 'flat' ? rateFlatValue : undefined,
          min_price_set: minCommissionEnabled ? minCommission : undefined,
          max_price_set: maxCommissionEnabled ? maxCommission : undefined,
        },
      }

      await createCommissionRule(rule_payload)
      setLoading(false)
      toast.success('Created!')
      onSuccess?.()
    } catch (e: unknown) {
      toast.error('Error!')
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <fieldset>
        <legend className="mb-2">Rule Name</legend>
        <Input
          name="name"
          placeholder="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </fieldset>
      <fieldset className="my-4">
        <legend className="mb-2">Rule Type</legend>
        <Select value={reference} onValueChange={(value) => setReference(value)}>
          <Select.Trigger>
            <Select.Value placeholder="Type" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="seller">Seller</Select.Item>
            <Select.Item value="product_type">Product type</Select.Item>
            <Select.Item value="product_category">Product category</Select.Item>
            <Select.Item value="seller+product_type">Seller + Product type</Select.Item>
            <Select.Item value="seller+product_category">Seller + Product category</Select.Item>
          </Select.Content>
        </Select>
      </fieldset>
      <fieldset className="my-4">
        <legend className="mb-2">Attribute</legend>
        {showSellers && sellers.length > 0 && (
          <Select value={seller} onValueChange={(value) => setSeller(value)}>
            <Select.Trigger>
              <Select.Value placeholder="Seller" />
            </Select.Trigger>
            <Select.Content>
              {sellers.map((s) => (
                <Select.Item key={s.id} value={s.id}>
                  {s.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        )}
        {showProductCategories && product_categories.length > 0 && (
          <Select value={category} onValueChange={(value) => setCategory(value)}>
            <Select.Trigger>
              <Select.Value placeholder="Product category" />
            </Select.Trigger>
            <Select.Content>
              {product_categories.map((s) => (
                <Select.Item key={s.id} value={s.id}>
                  {s.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        )}
        {showProductTypes && product_types.length > 0 && (
          <Select value={type} onValueChange={(value) => setType(value)}>
            <Select.Trigger>
              <Select.Value placeholder="Product type" />
            </Select.Trigger>
            <Select.Content>
              {product_types.map((s) => (
                <Select.Item key={s.id} value={s.id}>
                  {s.value}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        )}
      </fieldset>
      <fieldset className="my-4">
        <div className="flex items-center gap-x-2">
          <Switch
            id="include_tax"
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
        Create
      </Button>
    </form>
  )
}

export default CreateCommissionRuleForm
