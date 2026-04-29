import {
  Badge,
  Button,
  clx,
  FocusModal,
  Heading,
  Input,
  Label,
  ProgressStatus,
  ProgressTabs,
  RadioGroup,
  Select,
  Text,
  toast,
} from '@medusajs/ui'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateExtraCharge } from '../../../../../hooks/api/extra-charge'
import { useCreateExtraChargeRule } from '../../../../../hooks/api/extra-charge-rules'
import { Tab } from './constants'
import { templates } from './templates'

interface ExtraChargeFormData {
  name: string
  amount: number
  status: 'active' | 'inactive'
  type: string
  rules: {
    name: string
    attribute: string
    operator: string
    values: string[]
    priority: number
    status: 'active' | 'inactive'
  }[]
}

const defaultValues: ExtraChargeFormData = {
  name: '',
  amount: 0,
  status: 'active',
  type: '',
  rules: [],
}

type TabState = Record<Tab, ProgressStatus>

export const CreateExtraChargeForm = () => {
  const [tab, setTab] = useState<Tab>(Tab.TYPE)
  const [tabState, setTabState] = useState<TabState>({
    [Tab.TYPE]: 'in-progress',
    [Tab.DETAILS]: 'not-started',
    [Tab.RULES]: 'not-started',
  })

  const [formData, setFormData] = useState<ExtraChargeFormData>(defaultValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(true)
  const [ruleValuesInput, setRuleValuesInput] = useState<Record<number, string>>({})

  const navigate = useNavigate()

  const { mutateAsync: createExtraCharge } = useCreateExtraCharge()
  const { mutateAsync: createExtraChargeRule } = useCreateExtraChargeRule()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { rules, ...extraChargeData } = formData
      const response = await createExtraCharge(extraChargeData)
      const extraChargeId = response.extra_charge?.id

      if (rules && rules.length > 0 && extraChargeId) {
        for (const rule of rules) {
          await createExtraChargeRule({ ...rule, extra_charge_id: extraChargeId })
        }
      }

      toast.success(`Extra charge "${formData.name}" created successfully`)
      navigate('/extra-charge')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create extra charge'
      toast.error(msg)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be positive'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTabChange = (nextTab: Tab) => {
    switch (nextTab) {
      case Tab.TYPE:
        setTabState((prev) => ({ ...prev, [Tab.TYPE]: 'in-progress' }))
        setTab(nextTab)
        break
      case Tab.DETAILS:
        setTabState((prev) => ({ ...prev, [Tab.TYPE]: 'completed', [Tab.DETAILS]: 'in-progress' }))
        setTab(nextTab)
        break
      case Tab.RULES:
        if (validateForm()) {
          setTabState((prev) => ({
            ...prev,
            [Tab.DETAILS]: 'completed',
            [Tab.RULES]: 'in-progress',
          }))
          setTab(nextTab)
        } else {
          setTabState({ [Tab.TYPE]: 'completed', [Tab.DETAILS]: 'in-progress', [Tab.RULES]: 'not-started' })
          setTab(Tab.DETAILS)
        }
        break
    }
  }

  const handleContinue = () => {
    switch (tab) {
      case Tab.TYPE:
        handleTabChange(Tab.DETAILS)
        break
      case Tab.DETAILS:
        if (validateForm()) handleTabChange(Tab.RULES)
        break
      case Tab.RULES:
        break
    }
  }

  const currentTemplate = useMemo(
    () => templates.find((t) => t.id === formData.type),
    [formData.type]
  )

  const addRule = () => {
    const newIndex = formData.rules.length
    setFormData((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        { name: '', attribute: '', operator: 'eq', values: [], priority: 0, status: 'active' },
      ],
    }))
    setRuleValuesInput((prev) => ({ ...prev, [newIndex]: '' }))
  }

  const removeRule = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }))
    setRuleValuesInput((prev) => {
      const next = { ...prev }
      delete next[index]
      const reindexed: Record<number, string> = {}
      Object.keys(next).forEach((key) => {
        const old = Number(key)
        reindexed[old > index ? old - 1 : old] = next[old]
      })
      return reindexed
    })
  }

  const updateRule = (index: number, field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule
      ),
    }))
  }

  const updateFormData = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleClose = () => {
    setOpen(false)
    navigate('/extra-charge')
  }

  return (
    <FocusModal open={open} onOpenChange={handleClose}>
      <FocusModal.Content>
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <ProgressTabs
            value={tab}
            onValueChange={(t) => handleTabChange(t as Tab)}
            className="flex h-full flex-col overflow-hidden"
          >
            <FocusModal.Header>
              <div className="flex w-full items-center justify-between gap-x-4">
                <div className="-my-2 w-full max-w-[600px] border-l">
                  <ProgressTabs.List className="grid w-full grid-cols-3">
                    <ProgressTabs.Trigger className="w-full" value={Tab.TYPE} status={tabState[Tab.TYPE]}>
                      Template
                    </ProgressTabs.Trigger>
                    <ProgressTabs.Trigger className="w-full" value={Tab.DETAILS} status={tabState[Tab.DETAILS]}>
                      Details
                    </ProgressTabs.Trigger>
                    <ProgressTabs.Trigger className="w-full" value={Tab.RULES} status={tabState[Tab.RULES]}>
                      Rules
                    </ProgressTabs.Trigger>
                  </ProgressTabs.List>
                </div>
              </div>
            </FocusModal.Header>

            <FocusModal.Body className="size-full overflow-hidden">
              <ProgressTabs.Content value={Tab.TYPE} className="size-full overflow-y-auto">
                <div className="flex size-full flex-col items-center">
                  <div className="w-full max-w-[720px] py-16">
                    <Label>Extra Charge Type</Label>
                    <RadioGroup
                      value={formData.type}
                      onValueChange={(value) => updateFormData('type', value)}
                      className="flex-col gap-y-3 mt-4"
                    >
                      {templates.map((template) => (
                        <RadioGroup.ChoiceBox
                          key={template.id}
                          value={template.id}
                          label={template.title}
                          description={template.description}
                        />
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </ProgressTabs.Content>

              <ProgressTabs.Content value={Tab.DETAILS} className="size-full overflow-y-auto">
                <div className="flex size-full flex-col items-center">
                  <div className="flex w-full max-w-[720px] flex-col gap-y-8 py-16">
                    <Heading level="h1" className="text-fg-base">
                      Extra Charge Details
                      {currentTemplate?.title && (
                        <Badge className="ml-2 align-middle" color="grey" size="2xsmall" rounded="full">
                          {currentTemplate.title}
                        </Badge>
                      )}
                    </Heading>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => updateFormData('name', e.target.value)}
                          placeholder="Delivery Fee"
                          className="mt-2"
                        />
                        {errors.name && (
                          <Text className="text-red-500 text-sm mt-1">{errors.name}</Text>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => updateFormData('amount', parseFloat(e.target.value) || 0)}
                          placeholder="10.00"
                          className="mt-2"
                        />
                        {errors.amount && (
                          <Text className="text-red-500 text-sm mt-1">{errors.amount}</Text>
                        )}
                      </div>

                      <div>
                        <Label>Status</Label>
                        <RadioGroup
                          value={formData.status}
                          onValueChange={(value) => updateFormData('status', value)}
                          className="flex gap-y-3 mt-4"
                        >
                          <RadioGroup.ChoiceBox
                            value="active"
                            label="Active"
                            description="Extra charge is active and can be applied"
                            className={clx('basis-1/2')}
                          />
                          <RadioGroup.ChoiceBox
                            value="inactive"
                            label="Inactive"
                            description="Extra charge is disabled and won't be applied"
                            className={clx('basis-1/2')}
                          />
                        </RadioGroup>
                      </div>
                    </div>
                  </div>
                </div>
              </ProgressTabs.Content>

              <ProgressTabs.Content value={Tab.RULES} className="size-full overflow-y-auto">
                <div className="flex size-full flex-col items-center">
                  <div className="flex w-full max-w-[720px] flex-col gap-y-8 py-16">
                    <div className="flex items-center justify-between">
                      <Heading level="h1" className="text-fg-base">
                        Rules (Optional)
                      </Heading>
                      <Button type="button" variant="secondary" onClick={addRule}>
                        Add Rule
                      </Button>
                    </div>

                    <Text className="text-ui-fg-subtle">
                      Rules determine when this extra charge should be applied. If no rules are added,
                      the extra charge can be applied manually.
                    </Text>

                    {formData.rules.length > 0 && (
                      <div className="flex flex-col gap-y-6">
                        {formData.rules.map((rule, index) => (
                          <div key={index} className="border border-ui-border-base rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <Text weight="plus" size="small">
                                Rule {index + 1}
                              </Text>
                              <Button
                                type="button"
                                variant="danger"
                                size="small"
                                onClick={() => removeRule(index)}
                              >
                                Remove
                              </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Rule Name</Label>
                                <Input
                                  value={rule.name}
                                  onChange={(e) => updateRule(index, 'name', e.target.value)}
                                  placeholder="Rule name"
                                  className="mt-2"
                                />
                              </div>
                              <div>
                                <Label>Priority</Label>
                                <Input
                                  type="number"
                                  value={rule.priority}
                                  onChange={(e) =>
                                    updateRule(index, 'priority', parseInt(e.target.value) || 0)
                                  }
                                  placeholder="0"
                                  className="mt-2"
                                />
                              </div>
                              <div>
                                <Label>Attribute</Label>
                                <Select
                                  value={rule.attribute}
                                  onValueChange={(value) => updateRule(index, 'attribute', value)}
                                >
                                  <Select.Trigger className="mt-2">
                                    <Select.Value placeholder="Select attribute" />
                                  </Select.Trigger>
                                  <Select.Content>
                                    <Select.Item value="customer_group">Customer Group</Select.Item>
                                    <Select.Item value="region">Region</Select.Item>
                                    <Select.Item value="product_category">Product Category</Select.Item>
                                    <Select.Item value="order_total">Order Total</Select.Item>
                                    <Select.Item value="customer_email_domain">
                                      Customer Email Domain
                                    </Select.Item>
                                  </Select.Content>
                                </Select>
                              </div>
                              <div>
                                <Label>Operator</Label>
                                <Select
                                  value={rule.operator}
                                  onValueChange={(value) => updateRule(index, 'operator', value)}
                                >
                                  <Select.Trigger className="mt-2">
                                    <Select.Value placeholder="Select operator" />
                                  </Select.Trigger>
                                  <Select.Content>
                                    <Select.Item value="eq">Equals</Select.Item>
                                    <Select.Item value="in">In</Select.Item>
                                    <Select.Item value="gt">Greater Than</Select.Item>
                                    <Select.Item value="lt">Less Than</Select.Item>
                                    <Select.Item value="gte">Greater Than or Equal</Select.Item>
                                    <Select.Item value="lte">Less Than or Equal</Select.Item>
                                  </Select.Content>
                                </Select>
                              </div>
                              <div className="col-span-2">
                                <Label>Values (comma separated)</Label>
                                <Input
                                  value={
                                    ruleValuesInput[index] !== undefined
                                      ? ruleValuesInput[index]
                                      : rule.values.join(', ')
                                  }
                                  onChange={(e) =>
                                    setRuleValuesInput((prev) => ({
                                      ...prev,
                                      [index]: e.target.value,
                                    }))
                                  }
                                  onBlur={(e) => {
                                    const newValues = e.target.value
                                      .split(',')
                                      .map((v) => v.trim())
                                      .filter((v) => v !== '')
                                    updateRule(index, 'values', newValues)
                                    setRuleValuesInput((prev) => ({
                                      ...prev,
                                      [index]: newValues.join(', '),
                                    }))
                                  }}
                                  placeholder="value1, value2, value3"
                                  className="mt-2"
                                />
                              </div>
                              <div>
                                <Label>Status</Label>
                                <Select
                                  value={rule.status}
                                  onValueChange={(value) => updateRule(index, 'status', value)}
                                >
                                  <Select.Trigger className="mt-2">
                                    <Select.Value placeholder="Select status" />
                                  </Select.Trigger>
                                  <Select.Content>
                                    <Select.Item value="active">Active</Select.Item>
                                    <Select.Item value="inactive">Inactive</Select.Item>
                                  </Select.Content>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.rules.length === 0 && (
                      <div className="text-center py-8">
                        <Text className="text-ui-fg-subtle">
                          No rules added yet. Click "Add Rule" to create conditional rules for this
                          extra charge.
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              </ProgressTabs.Content>
            </FocusModal.Body>
          </ProgressTabs>

          <FocusModal.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Button variant="secondary" size="small" onClick={handleClose}>
                Cancel
              </Button>

              {tab === Tab.RULES ? (
                <Button key="save-btn" type="submit" size="small">
                  Create Extra Charge
                </Button>
              ) : (
                <Button key="continue-btn" type="button" onClick={handleContinue} size="small">
                  Continue
                </Button>
              )}
            </div>
          </FocusModal.Footer>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
}
