import { DocumentText } from '@medusajs/icons'
import {
  Button,
  Container,
  DataTable,
  DataTablePaginationState,
  Drawer,
  Heading,
  StatusBadge,
  Text,
  useDataTable,
} from '@medusajs/ui'
import type { RouteConfig } from '@mercurjs/dashboard-sdk'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useCommissionRules, useDefaultCommissionRule } from '../../hooks/api/commission'
import { AdminCommissionAggregate } from './types'
import { CommissionDetailTable } from './components/commission-detail-table'
import { CommissionActionMenu } from './components/commission-actions'
import CreateCommissionRuleForm from './components/create-commission-rule-form'
import UpsertDefaultCommissionRuleForm from './components/upsert-default-commission-rule'

const PAGE_SIZE = 20

const columnHelper = createColumnHelper<AdminCommissionAggregate>()

const Commission = () => {
  const [createRuleOpen, setCreateRuleOpen] = useState(false)
  const [upsertDefaultOpen, setUpsertDefaultOpen] = useState(false)
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  const defaultRule = useDefaultCommissionRule()

  const offset = pagination.pageIndex * pagination.pageSize
  const {
    commission_rules,
    count,
    isPending: isLoading,
    refetch,
  } = useCommissionRules({ limit: PAGE_SIZE, offset })

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Rule Name',
        cell: ({ getValue }) => <Text>{getValue() ?? '-'}</Text>,
      }),
      columnHelper.accessor('reference', {
        header: 'Type',
        cell: ({ getValue }) => <Text>{getValue() ?? '-'}</Text>,
      }),
      columnHelper.accessor('ref_value', {
        header: 'Attribute',
        cell: ({ getValue }) => <Text>{getValue() ?? '-'}</Text>,
      }),
      columnHelper.accessor('fee_value', {
        header: 'Fee',
        cell: ({ getValue }) => <Text>{getValue() ?? '-'}</Text>,
      }),
      columnHelper.accessor('is_active', {
        header: 'Status',
        cell: ({ getValue }) => {
          const value = getValue()
          return (
            <StatusBadge color={value ? 'green' : 'grey'}>
              {value ? 'Enabled' : 'Disabled'}
            </StatusBadge>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        cell: ({ row }) => (
          <CommissionActionMenu
            id={row.original.id!}
            is_active={row.original.is_active!}
            onSuccess={() => refetch()}
          />
        ),
      }),
    ],
    [refetch]
  )

  const table = useDataTable({
    data: (commission_rules ?? []) as AdminCommissionAggregate[],
    columns,
    rowCount: count ?? 0,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    getRowId: (row) => row.id ?? '',
  })

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>Global Commission Settings</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              Manage global commission settings for your marketplace.
            </Text>
          </div>

          <Drawer
            open={upsertDefaultOpen}
            onOpenChange={(open) => setUpsertDefaultOpen(open)}
          >
            <Drawer.Trigger
              onClick={() => setUpsertDefaultOpen(true)}
              asChild
            >
              <Button variant="secondary">Edit</Button>
            </Drawer.Trigger>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Edit default rule</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <UpsertDefaultCommissionRuleForm
                  onSuccess={() => {
                    setUpsertDefaultOpen(false)
                    defaultRule.refetch()
                  }}
                  rule={defaultRule.commission_rule}
                />
              </Drawer.Body>
            </Drawer.Content>
          </Drawer>
        </div>

        <CommissionDetailTable commissionRule={defaultRule.commission_rule} />
      </Container>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>Commission Rules</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              View, search, and manage existing commission rules.
            </Text>
          </div>
          <Drawer
            open={createRuleOpen}
            onOpenChange={(open) => setCreateRuleOpen(open)}
          >
            <Drawer.Trigger
              onClick={() => setCreateRuleOpen(true)}
              asChild
            >
              <Button variant="secondary">Create</Button>
            </Drawer.Trigger>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Create Rule</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <CreateCommissionRuleForm
                  onSuccess={() => {
                    setCreateRuleOpen(false)
                    refetch()
                  }}
                />
              </Drawer.Body>
            </Drawer.Content>
          </Drawer>
        </div>

        <DataTable instance={table}>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </Container>
    </>
  )
}

export const config: RouteConfig = {
  label: 'Commission settings',
  icon: DocumentText,
}

export default Commission
