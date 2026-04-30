import { CurrencyDollar } from '@medusajs/icons'
import {
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Table,
  Text,
} from '@medusajs/ui'
import type { RouteConfig } from '@mercurjs/dashboard-sdk'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  useExtraCharges,
  useCreateExtraCharge,
  useUpdateExtraCharge,
  ExtraCharge,
} from '../../hooks/api/extra-charge'
import {
  useExtraChargeRules,
  useCreateExtraChargeRule,
  useUpdateExtraChargeRule,
  useDeleteExtraChargeRule,
  ExtraChargeRule,
} from '../../hooks/api/extra-charge-rules'

const PAGE_SIZE = 20

const emptyForm: FormState = { name: '', amount: '', status: 'active' }
interface FormState { name: string; amount: string; status: 'active' | 'inactive'; id?: string }

interface RuleFormState {
  extra_charge_id: string
  name: string
  attribute: string
  operator: string
  values: string[]
  priority: number
  status: 'active' | 'inactive'
  id?: string
}

const emptyRuleForm: RuleFormState = {
  extra_charge_id: '',
  name: '',
  attribute: '',
  operator: 'eq',
  values: [''],
  priority: 0,
  status: 'active',
}

const StepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({
  currentStep,
  totalSteps,
}) => (
  <div className="flex items-center justify-center space-x-2 mb-4">
    {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
      <div key={step} className="flex items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === currentStep
              ? 'bg-blue-500 text-white'
              : step < currentStep
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          {step < currentStep ? '✓' : step}
        </div>
        {step < totalSteps && (
          <div
            className={`w-8 h-1 mx-1 ${step < currentStep ? 'bg-green-500' : 'bg-gray-200'}`}
          />
        )}
      </div>
    ))}
  </div>
)

const ExtraChargeForm: React.FC<{
  form: FormState
  setForm: (f: FormState | ((f: FormState) => FormState)) => void
  onSubmit: () => void
  loading: boolean
}> = ({ form, setForm, onSubmit, loading }) => (
  <form
    onSubmit={(e) => {
      e.preventDefault()
      onSubmit()
    }}
    className="flex flex-col gap-4 px-2"
  >
    <Heading level="h2" className="mb-2">
      {form.id ? 'Edit Extra Charge' : 'Create Extra Charge'}
    </Heading>
    <Input
      name="name"
      value={form.name}
      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      placeholder="Name"
      required
    />
    <Input
      name="amount"
      value={form.amount}
      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
      placeholder="Amount"
      required
      type="number"
    />
    <Select
      value={form.status}
      onValueChange={(val) => setForm((f) => ({ ...f, status: val as 'active' | 'inactive' }))}
    >
      <Select.Trigger>
        <Select.Value placeholder="Status" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="active">Active</Select.Item>
        <Select.Item value="inactive">Inactive</Select.Item>
      </Select.Content>
    </Select>
    <Button type="submit" disabled={loading}>
      {form.id ? 'Update' : 'Create'}
    </Button>
  </form>
)

const ExtraChargeRuleForm: React.FC<{
  form: RuleFormState
  setForm: (f: RuleFormState | ((f: RuleFormState) => RuleFormState)) => void
  onSubmit: () => void
  loading: boolean
  extraCharges: ExtraCharge[]
  isMultiStep?: boolean
  onBack?: () => void
  onSkip?: () => void
}> = ({ form, setForm, onSubmit, loading, extraCharges, isMultiStep, onBack, onSkip }) => (
  <form
    onSubmit={(e) => {
      e.preventDefault()
      onSubmit()
    }}
    className="flex flex-col gap-4 px-2"
  >
    <Heading level="h2" className="mb-2">
      {form.id ? 'Edit Extra Charge Rule' : 'Create Extra Charge Rule'}
    </Heading>
    <Label>Extra Charge</Label>
    <Select
      value={form.extra_charge_id}
      onValueChange={(val) => setForm((f) => ({ ...f, extra_charge_id: val }))}
    >
      <Select.Trigger>
        <Select.Value placeholder="Select Extra Charge" />
      </Select.Trigger>
      <Select.Content>
        {extraCharges.map((charge) => (
          <Select.Item key={charge.id} value={charge.id}>
            {charge.name}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
    <Label>Rule Name</Label>
    <Input
      name="name"
      value={form.name}
      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      placeholder="Rule Name"
      required
    />
    <Label>Attribute</Label>
    <Select
      value={form.attribute}
      onValueChange={(val) => setForm((f) => ({ ...f, attribute: val }))}
    >
      <Select.Trigger>
        <Select.Value placeholder="Select Attribute" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="customer_group">Customer Group</Select.Item>
        <Select.Item value="region">Region</Select.Item>
        <Select.Item value="product_category">Product Category</Select.Item>
        <Select.Item value="order_total">Order Total</Select.Item>
        <Select.Item value="customer_email_domain">Customer Email Domain</Select.Item>
      </Select.Content>
    </Select>
    <Label>Operator</Label>
    <Select
      value={form.operator}
      onValueChange={(val) => setForm((f) => ({ ...f, operator: val }))}
    >
      <Select.Trigger>
        <Select.Value placeholder="Select Operator" />
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
    <Label>Values</Label>
    <Input
      name="values"
      value={form.values.join(',')}
      onChange={(e) =>
        setForm((f) => ({
          ...f,
          values: e.target.value.split(',').map((v) => v.trim()),
        }))
      }
      placeholder="Values (comma separated)"
      required
    />
    <Label>Priority</Label>
    <Input
      name="priority"
      value={form.priority}
      onChange={(e) =>
        setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))
      }
      placeholder="Priority"
      type="number"
    />
    <Label>Status</Label>
    <Select
      value={form.status}
      onValueChange={(val) => setForm((f) => ({ ...f, status: val as 'active' | 'inactive' }))}
    >
      <Select.Trigger>
        <Select.Value placeholder="Status" />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="active">Active</Select.Item>
        <Select.Item value="inactive">Inactive</Select.Item>
      </Select.Content>
    </Select>

    <div className="flex gap-2">
      {isMultiStep && onBack && (
        <Button type="button" variant="secondary" onClick={onBack}>
          Back
        </Button>
      )}
      {isMultiStep && onSkip && (
        <Button type="button" variant="secondary" onClick={onSkip}>
          Skip Rule
        </Button>
      )}
      <Button type="submit" disabled={loading}>
        {form.id ? 'Update' : isMultiStep ? 'Create Rule & Finish' : 'Create'}
      </Button>
    </div>
  </form>
)

const ExtraChargePage = () => {
  const [currentPage, setCurrentPage] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState(false)

  const [currentStep, setCurrentStep] = useState(1)
  const [createdExtraCharge, setCreatedExtraCharge] = useState<ExtraCharge | null>(null)
  const [skipRuleCreation, setSkipRuleCreation] = useState(false)

  const [activeTab, setActiveTab] = useState('charges')

  const [ruleDrawerOpen, setRuleDrawerOpen] = useState(false)
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm)
  const [editingRule, setEditingRule] = useState(false)

  const { data: rules = [], isLoading: loadingRules } = useExtraChargeRules()
  const createRule = useCreateExtraChargeRule()
  const updateRule = useUpdateExtraChargeRule()
  const deleteRule = useDeleteExtraChargeRule()

  const handleEditRule = (rule: ExtraChargeRule) => {
    setRuleForm({ ...rule, values: rule.values || [''] })
    setEditingRule(true)
    setRuleDrawerOpen(true)
  }

  const handleCreateRule = () => {
    setRuleForm(emptyRuleForm)
    setEditingRule(false)
    setRuleDrawerOpen(true)
  }

  const handleDeleteRule = (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      deleteRule.mutate(id)
    }
  }

  const { data = [], isLoading } = useExtraCharges()
  const createExtraCharge = useCreateExtraCharge()
  const updateExtraCharge = useUpdateExtraCharge()

  const paginatedData = data.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const handleSubmit = () => {
    if (editing && form.id) {
      updateExtraCharge.mutate(
        { id: form.id, name: form.name, amount: Number(form.amount), status: form.status },
        {
          onSuccess: () => {
            setForm(emptyForm)
            setEditing(false)
            setDrawerOpen(false)
          },
        }
      )
    } else {
      createExtraCharge.mutate(
        { name: form.name, amount: Number(form.amount), status: form.status },
        {
          onSuccess: (resp) => {
            if (skipRuleCreation) {
              setForm(emptyForm)
              setCurrentStep(1)
              setDrawerOpen(false)
              setSkipRuleCreation(false)
            } else {
              setCreatedExtraCharge(resp.extra_charge)
              setRuleForm((prev) => ({ ...prev, extra_charge_id: resp.extra_charge?.id ?? '' }))
              setCurrentStep(2)
            }
          },
        }
      )
    }
  }

  const handleRuleSubmit = () => {
    if (editingRule && ruleForm.id) {
      updateRule.mutate(
        { id: ruleForm.id, ...ruleForm },
        {
          onSuccess: () => {
            setRuleForm(emptyRuleForm)
            setEditingRule(false)
            setRuleDrawerOpen(false)
          },
        }
      )
    } else {
      createRule.mutate(ruleForm, {
        onSuccess: () => {
          if (currentStep === 2) {
            setForm(emptyForm)
            setRuleForm(emptyRuleForm)
            setCurrentStep(1)
            setCreatedExtraCharge(null)
            setDrawerOpen(false)
          } else {
            setRuleForm(emptyRuleForm)
            setEditingRule(false)
            setRuleDrawerOpen(false)
          }
        },
      })
    }
  }

  const handleSkipRuleCreation = () => {
    setForm(emptyForm)
    setRuleForm(emptyRuleForm)
    setCurrentStep(1)
    setCreatedExtraCharge(null)
    setDrawerOpen(false)
  }

  const handleBackToStep1 = () => {
    setCurrentStep(1)
  }

  return (
    <Container>
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('charges')}
          className={`px-4 py-2 border-b-2 font-medium text-sm ${
            activeTab === 'charges'
              ? 'border-white-900 text-white-900'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Extra Charges
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 border-b-2 font-medium text-sm ${
            activeTab === 'rules'
              ? 'border-white-900 text-white-900'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Extra Charge Rules
        </button>
      </div>

      {/* Extra Charges Tab */}
      {activeTab === 'charges' && (
        <>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <Heading>Extra Charges</Heading>
              <Text className="text-ui-fg-subtle" size="small">
                Manage extra charges for your marketplace.
              </Text>
            </div>
            <div className="flex gap-2">
              <Link to="/extra-charge/create">
                <Button variant="primary">Create Extra Charge</Button>
              </Link>

              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <Drawer.Trigger asChild></Drawer.Trigger>
                <Drawer.Content>
                  <Drawer.Header>
                    <Drawer.Title>
                      <Heading level="h2">
                        {editing
                          ? 'Edit Extra Charge'
                          : currentStep === 1
                          ? 'Create Extra Charge'
                          : 'Create Rule for Extra Charge'}
                      </Heading>
                    </Drawer.Title>
                  </Drawer.Header>
                  <Drawer.Body className="overflow-y-auto">
                    {!editing && <StepIndicator currentStep={currentStep} totalSteps={2} />}
                    {currentStep === 1 ? (
                      <ExtraChargeForm
                        form={form}
                        setForm={setForm}
                        onSubmit={handleSubmit}
                        loading={createExtraCharge.isPending || updateExtraCharge.isPending}
                      />
                    ) : (
                      <ExtraChargeRuleForm
                        form={ruleForm}
                        setForm={setRuleForm}
                        onSubmit={handleRuleSubmit}
                        loading={createRule.isPending}
                        extraCharges={createdExtraCharge ? [createdExtraCharge] : []}
                        isMultiStep
                        onBack={handleBackToStep1}
                        onSkip={handleSkipRuleCreation}
                      />
                    )}
                  </Drawer.Body>
                </Drawer.Content>
              </Drawer>
            </div>
          </div>
          <div className="flex size-full flex-col overflow-hidden">
            {isLoading && <Text>Loading...</Text>}
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Name</Table.HeaderCell>
                  <Table.HeaderCell>Amount</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Created At</Table.HeaderCell>
                  <Table.HeaderCell>Updated At</Table.HeaderCell>
                  <Table.HeaderCell>Actions</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {paginatedData.map((fee) => (
                  <Table.Row key={fee.id}>
                    <Table.Cell>{fee.name}</Table.Cell>
                    <Table.Cell>{fee.amount}</Table.Cell>
                    <Table.Cell>{fee.status}</Table.Cell>
                    <Table.Cell>{new Date(fee.created_at).toLocaleString()}</Table.Cell>
                    <Table.Cell>{new Date(fee.updated_at).toLocaleString()}</Table.Cell>
                    <Table.Cell>
                      <Link to={`/extra-charge/${fee.id}/edit`}>
                        <Button variant="secondary" size="small" style={{ marginRight: 8 }}>
                          Edit
                        </Button>
                      </Link>
                      <Switch
                        checked={fee.status === 'active'}
                        onCheckedChange={() => {
                          updateExtraCharge.mutate({
                            id: fee.id,
                            status: fee.status === 'active' ? 'inactive' : 'active',
                          })
                        }}
                        className="ml-2"
                      />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            <Table.Pagination
              className="w-full"
              canNextPage={PAGE_SIZE * (currentPage + 1) < data.length}
              canPreviousPage={currentPage > 0}
              previousPage={() => setCurrentPage(currentPage - 1)}
              nextPage={() => setCurrentPage(currentPage + 1)}
              count={data.length}
              pageCount={Math.ceil(data.length / PAGE_SIZE)}
              pageIndex={currentPage}
              pageSize={PAGE_SIZE}
            />
          </div>
        </>
      )}

      {/* Extra Charge Rules Tab */}
      {activeTab === 'rules' && (
        <>
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <Heading>Extra Charge Rules</Heading>
              <Text className="text-ui-fg-subtle" size="small">
                Manage rules for applying extra charges based on conditions.
              </Text>
            </div>
            <Drawer open={ruleDrawerOpen} onOpenChange={setRuleDrawerOpen}>
              <Drawer.Trigger asChild>
                <Button variant="secondary" onClick={handleCreateRule}>
                  Create Rule
                </Button>
              </Drawer.Trigger>
              <Drawer.Content>
                <Drawer.Header>
                  <Drawer.Title>
                    <Heading level="h2">
                      {editingRule ? 'Edit Extra Charge Rule' : 'Create Extra Charge Rule'}
                    </Heading>
                  </Drawer.Title>
                </Drawer.Header>
                <Drawer.Body className="overflow-y-auto">
                  <ExtraChargeRuleForm
                    form={ruleForm}
                    setForm={setRuleForm}
                    onSubmit={handleRuleSubmit}
                    loading={createRule.isPending || updateRule.isPending}
                    extraCharges={data}
                  />
                </Drawer.Body>
              </Drawer.Content>
            </Drawer>
          </div>
          <div className="flex size-full flex-col overflow-hidden">
            {loadingRules && <Text>Loading...</Text>}
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Name</Table.HeaderCell>
                  <Table.HeaderCell>Extra Charge</Table.HeaderCell>
                  <Table.HeaderCell>Attribute</Table.HeaderCell>
                  <Table.HeaderCell>Operator</Table.HeaderCell>
                  <Table.HeaderCell>Values</Table.HeaderCell>
                  <Table.HeaderCell>Priority</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Actions</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {rules.map((rule) => {
                  const extraCharge = data.find((ec) => ec.id === rule.extra_charge_id)
                  return (
                    <Table.Row key={rule.id}>
                      <Table.Cell>{rule.name}</Table.Cell>
                      <Table.Cell>{extraCharge?.name || rule.extra_charge_id}</Table.Cell>
                      <Table.Cell>{rule.attribute}</Table.Cell>
                      <Table.Cell>{rule.operator}</Table.Cell>
                      <Table.Cell>{rule.values?.join(', ') || ''}</Table.Cell>
                      <Table.Cell>{rule.priority}</Table.Cell>
                      <Table.Cell>{rule.status}</Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleEditRule(rule)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table>
          </div>
        </>
      )}
    </Container>
  )
}

export const config: RouteConfig = {
  label: 'Extra Charge',
  icon: CurrencyDollar,
}

export default ExtraChargePage
