import { CSSProperties, MouseEvent, Suspense, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Primitive from "@uiw/react-json-view"
import {
  Drawer,
  IconButton,
  Kbd,
  Badge,
  Button,
  CodeBlock,
  Container,
  Heading,
  Text,
  clx,
} from "@medusajs/ui"
import {
  ArrowLeft,
  ArrowUpRightOnBox,
  Check,
  SquareTwoStack,
  TriangleDownMini,
  XMarkMini,
} from "@medusajs/icons"
import { useWorkflowExecution } from "../../../../hooks/api/workflow-executions"

const humanizeState = (state?: string) => {
  if (!state) return "-"
  return state
    .replace(/-/g, "_")
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") return {}
  return value as Record<string, unknown>
}

type WorkflowStepRecord = {
  id: string
  invoke: Record<string, unknown>
  compensate: Record<string, unknown>
  definition?: unknown
  startedAt?: number
  [key: string]: unknown
}

const toStepRecord = (
  value: unknown,
  fallbackId?: string
): WorkflowStepRecord | null => {
  const raw = toRecord(value)
  const id = typeof raw.id === "string" ? raw.id : fallbackId

  if (typeof id !== "string") {
    return null
  }

  return {
    ...raw,
    id,
    invoke: toRecord(raw.invoke),
    compensate: toRecord(raw.compensate),
    startedAt: typeof raw.startedAt === "number" ? raw.startedAt : undefined,
  }
}

const statusColor = (state?: string): "green" | "red" | "orange" | "grey" => {
  const normalizedState = state?.replace(/-/g, "_")
  switch (normalizedState) {
    case "done":
      return "green"
    case "failed":
    case "reverted":
      return "red"
    case "invoking":
    case "waiting_to_compensate":
    case "compensating":
      return "orange"
    default:
      return "grey"
  }
}

const stepDotColor = (state?: string) => {
  const normalizedState = state?.replace(/-/g, "_")

  if (["done"].includes(normalizedState || "")) {
    return "bg-ui-tag-green-icon"
  }
  if (
    ["failed", "reverted", "timeout", "dormant", "permanent_failure"].includes(
      normalizedState || ""
    )
  ) {
    return "bg-ui-tag-red-icon"
  }
  if (
    ["invoking", "compensating", "waiting_response", "temp_failure"].includes(
      normalizedState || ""
    )
  ) {
    return "bg-ui-tag-orange-icon"
  }
  if (["skipped", "skipped_failure"].includes(normalizedState || "")) {
    return "bg-ui-tag-neutral-bg"
  }

  return "bg-ui-tag-neutral-icon"
}

const formatDateTime = (value?: string) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

const createNodeClusters = (steps: WorkflowStepRecord[]) => {
  const clusters: Record<number, WorkflowStepRecord[]> = {}

  steps.forEach((step) => {
    const depth = Number(step.depth ?? 0)
    if (!clusters[depth]) {
      clusters[depth] = []
    }
    clusters[depth].push(step)
  })

  return clusters
}

const getNextCluster = (
  clusters: Record<number, WorkflowStepRecord[]>,
  depth: number
) => {
  return clusters[depth + 1]
}

const HorizontalArrow = () => (
  <svg width="42" height="12" viewBox="0 0 42 12" fill="none">
    <path
      d="M41.5303 6.53033C41.8232 6.23744 41.8232 5.76256 41.5303 5.46967L36.7574 0.696699C36.4645 0.403806 35.9896 0.403806 35.6967 0.696699C35.4038 0.989593 35.4038 1.46447 35.6967 1.75736L39.9393 6L35.6967 10.2426C35.4038 10.5355 35.4038 11.0104 35.6967 11.3033C35.9896 11.5962 36.4645 11.5962 36.7574 11.3033L41.5303 6.53033ZM0.999996 5.25C0.585785 5.25 0.249996 5.58579 0.249996 6C0.249996 6.41421 0.585785 6.75 0.999996 6.75V5.25ZM41 5.25L0.999996 5.25V6.75L41 6.75V5.25Z"
      fill="var(--border-strong)"
    />
  </svg>
)

const MiddleArrow = () => (
  <svg width="22" height="38" viewBox="0 0 22 38" fill="none" className="-mt-[6px]">
    <path
      d="M0.999878 32H0.249878V32.75H0.999878V32ZM21.5284 32.5303C21.8213 32.2374 21.8213 31.7626 21.5284 31.4697L16.7554 26.6967C16.4625 26.4038 15.9876 26.4038 15.6947 26.6967C15.4019 26.9896 15.4019 27.4645 15.6947 27.7574L19.9374 32L15.6947 36.2426C15.4019 36.5355 15.4019 37.0104 15.6947 37.3033C15.9876 37.5962 16.4625 37.5962 16.7554 37.3033L21.5284 32.5303ZM0.249878 0L0.249878 32H1.74988L1.74988 0H0.249878ZM0.999878 32.75L20.998 32.75V31.25L0.999878 31.25V32.75Z"
      fill="var(--border-strong)"
    />
  </svg>
)

const EndArrow = () => (
  <svg width="22" height="38" viewBox="0 0 22 38" fill="none" className="-mt-[6px]">
    <path
      d="M21.5284 32.5303C21.8213 32.2374 21.8213 31.7626 21.5284 31.4697L16.7554 26.6967C16.4625 26.4038 15.9876 26.4038 15.6947 26.6967C15.4019 26.9896 15.4019 27.4645 15.6947 27.7574L19.9374 32L15.6947 36.2426C15.4019 36.5355 15.4019 37.0104 15.6947 37.3033C15.9876 37.5962 16.4625 37.5962 16.7554 37.3033L21.5284 32.5303ZM0.249878 0L0.249878 28H1.74988L1.74988 0H0.249878ZM4.99988 32.75L20.998 32.75V31.25L4.99988 31.25V32.75ZM0.249878 28C0.249878 30.6234 2.37653 32.75 4.99988 32.75V31.25C3.20495 31.25 1.74988 29.7949 1.74988 28H0.249878Z"
      fill="var(--border-strong)"
    />
  </svg>
)

const Arrow = ({ depth }: { depth: number }) => {
  if (depth <= 1) return <HorizontalArrow />
  if (depth === 2) {
    return (
      <div className="flex flex-col items-end">
        <HorizontalArrow />
        <EndArrow />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end">
      <HorizontalArrow />
      {Array.from({ length: depth - 2 }).map((_, index) => (
        <MiddleArrow key={index} />
      ))}
      <EndArrow />
    </div>
  )
}

const Line = ({ next }: { next?: WorkflowStepRecord[] }) => {
  if (!next?.length) return null

  return (
    <div className="-ml-[5px] -mr-[7px] w-[60px] pr-[7px]">
      <div className="flex min-h-[24px] w-full items-start">
        <div className="flex h-6 w-2.5 items-center justify-center">
          <div className="bg-ui-button-neutral shadow-borders-base size-2.5 shrink-0 rounded-full" />
        </div>
        <div className="pt-1.5">
          <Arrow depth={next.length} />
        </div>
      </div>
    </div>
  )
}

const JsonCopied = ({ style, value }: { style?: CSSProperties; value: unknown }) => {
  const [copied, setCopied] = useState(false)

  const handler = (e: MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation()
    setCopied(true)

    if (typeof value === "string") {
      navigator.clipboard.writeText(value)
    } else {
      navigator.clipboard.writeText(JSON.stringify(value, null, 2))
    }

    setTimeout(() => setCopied(false), 2000)
  }

  const styl: CSSProperties = { whiteSpace: "nowrap", width: "20px" }

  if (copied) {
    return (
      <span style={{ ...style, ...styl }}>
        <Check className="text-ui-contrast-fg-primary" />
      </span>
    )
  }

  return (
    <span style={{ ...style, ...styl }} onClick={handler}>
      <SquareTwoStack className="text-ui-contrast-fg-secondary" />
    </span>
  )
}

const JsonInlineBlock = ({
  label,
  value,
}: {
  label: string
  value: unknown
}) => {
  const resolvedValue = value ?? {}

  return (
    <div className="text-ui-fg-subtle flex flex-col gap-y-2">
      <Text size="small" leading="compact">
        {label}
      </Text>
      <CodeBlock
        snippets={[
          {
            code: JSON.stringify(resolvedValue, null, 2),
            label,
            language: "json",
            hideLineNumbers: true,
          },
        ]}
      >
        <CodeBlock.Body />
      </CodeBlock>
    </div>
  )
}

const JsonDrawerContent = ({
  data,
  keysCount,
  title,
}: {
  data: object
  keysCount: number
  title: string
}) => {
  return (
    <Drawer>
      <Drawer.Trigger asChild>
        <IconButton
          size="small"
          variant="transparent"
          className="text-ui-fg-muted hover:text-ui-fg-subtle"
        >
          <ArrowUpRightOnBox />
        </IconButton>
      </Drawer.Trigger>
      <Drawer.Content
        dir="ltr"
        className="bg-ui-contrast-bg-base text-ui-code-fg-subtle !shadow-elevation-commandbar overflow-hidden border border-none max-md:inset-x-2 max-md:max-w-[calc(100%-16px)]"
      >
        <div className="bg-ui-code-bg-base flex items-center justify-between px-6 py-4">
          <Drawer.Title asChild>
            <Heading className="text-ui-contrast-fg-primary">
              {title} ({keysCount} keys)
            </Heading>
          </Drawer.Title>
          <div className="flex items-center gap-x-2">
            <Kbd className="bg-ui-contrast-bg-subtle border-ui-contrast-border-base text-ui-contrast-fg-secondary">
              esc
            </Kbd>
            <Drawer.Close asChild>
              <IconButton
                size="small"
                variant="transparent"
                className="text-ui-contrast-fg-secondary hover:text-ui-contrast-fg-primary"
              >
                <XMarkMini />
              </IconButton>
            </Drawer.Close>
          </div>
        </div>
        <Drawer.Body className="flex flex-1 flex-col overflow-hidden px-[5px] py-0 pb-[5px]">
          <div className="bg-ui-contrast-bg-subtle flex-1 overflow-auto rounded-b-[4px] rounded-t-lg p-3">
            <Suspense fallback={<div className="flex size-full flex-col" />}>
              <Primitive
                value={data}
                displayDataTypes={false}
                style={
                  {
                    "--w-rjv-font-family": "Roboto Mono, monospace",
                    "--w-rjv-line-color": "var(--contrast-border-base)",
                    "--w-rjv-curlybraces-color": "var(--contrast-fg-secondary)",
                    "--w-rjv-brackets-color": "var(--contrast-fg-secondary)",
                    "--w-rjv-key-string": "var(--contrast-fg-primary)",
                    "--w-rjv-info-color": "var(--contrast-fg-secondary)",
                    "--w-rjv-type-string-color": "var(--tag-green-icon)",
                    "--w-rjv-quotes-string-color": "var(--tag-green-icon)",
                    "--w-rjv-type-boolean-color": "var(--tag-orange-icon)",
                    "--w-rjv-type-int-color": "var(--tag-orange-icon)",
                    "--w-rjv-type-float-color": "var(--tag-orange-icon)",
                    "--w-rjv-type-bigint-color": "var(--tag-orange-icon)",
                    "--w-rjv-key-number": "var(--contrast-fg-secondary)",
                    "--w-rjv-arrow-color": "var(--contrast-fg-secondary)",
                    "--w-rjv-copied-color": "var(--contrast-fg-secondary)",
                    "--w-rjv-copied-success-color": "var(--contrast-fg-primary)",
                    "--w-rjv-colon-color": "var(--contrast-fg-primary)",
                    "--w-rjv-ellipsis-color": "var(--contrast-fg-secondary)",
                  } as CSSProperties
                }
                collapsed={1}
              >
                <Primitive.Quote render={() => <span />} />
                <Primitive.Null
                  render={() => <span className="text-ui-tag-red-icon">null</span>}
                />
                <Primitive.Undefined
                  render={() => <span className="text-ui-tag-blue-icon">undefined</span>}
                />
                <Primitive.CountInfo
                  render={(_props, { value }) => (
                    <span className="text-ui-contrast-fg-secondary ml-2">
                      {Object.keys(value as object).length} items
                    </span>
                  )}
                />
                <Primitive.Arrow>
                  <TriangleDownMini className="text-ui-contrast-fg-secondary -ml-[0.5px]" />
                </Primitive.Arrow>
                <Primitive.Colon>
                  <span className="mr-1">:</span>
                </Primitive.Colon>
                <Primitive.Copied
                  render={({ style }, { value }) => (
                    <JsonCopied style={style} value={value} />
                  )}
                />
              </Primitive>
            </Suspense>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}

export default function WorkflowExecutionDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()

  const { workflow_execution, isLoading, isError, error } = useWorkflowExecution(id)

  const steps = useMemo(() => {
    const map = Object.entries(toRecord(toRecord(workflow_execution?.execution).steps))
      .map(([key, step]) => toStepRecord(step, key))
      .filter((step): step is WorkflowStepRecord => Boolean(step))
      .filter((step) => step.id !== "_root")

    return map
  }, [workflow_execution])

  const progress = useMemo(() => {
    const completed = steps.filter((step) => toRecord(step.invoke).state === "done").length
    return { completed, count: steps.length }
  }, [steps])

  const unreachableStepId = steps.find(
    (step) => step.invoke.status === "permanent_failure"
  )?.id

  const unreachableSteps = unreachableStepId
    ? steps
        .filter((step) => step.id !== unreachableStepId && step.id.includes(unreachableStepId))
        .map((step) => step.id)
    : []

  const payload = toRecord(toRecord(workflow_execution?.context).data).payload
  const normalizedPayload =
    payload && typeof payload === "object" ? (payload as object) : payload ? { input: payload } : null
  const timelineClusters = useMemo(() => createNodeClusters(steps), [steps])
  const jsonKeysCount = Object.keys(toRecord(workflow_execution)).length
  const payloadKeysCount = normalizedPayload ? Object.keys(normalizedPayload).length : 0

  if (isLoading) {
    return (
      <Container>
        <Text className="text-ui-fg-muted">Loading workflow execution...</Text>
      </Container>
    )
  }

  if (isError || !workflow_execution) {
    return (
      <Container>
        <Text className="text-ui-fg-muted">
          Failed to load workflow execution. {error?.message}
        </Text>
      </Container>
    )
  }

  const cleanId = (workflow_execution.id || "").replace("wf_exec_", "")

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="flex items-center justify-between">
        <Button variant="secondary" size="small" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-2">
            <Heading>{cleanId || workflow_execution.id}</Heading>
          </div>
          <Badge color={statusColor(workflow_execution.state)} size="2xsmall">
            {humanizeState(workflow_execution.state)}
          </Badge>
        </div>
        <div className="grid grid-cols-2 px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Workflow ID
          </Text>
          <Badge size="2xsmall" className="w-fit">
            {workflow_execution.workflow_id}
          </Badge>
        </div>
        <div className="grid grid-cols-2 px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Transaction ID
          </Text>
          <Badge size="2xsmall" className="w-fit">
            {workflow_execution.transaction_id}
          </Badge>
        </div>
        <div className="grid grid-cols-2 px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Progress
          </Text>
          <div className="flex items-center gap-x-2">
            <div className="flex items-center gap-x-[3px]">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={clx(
                    "shadow-details-switch-background h-3 w-1.5 rounded-full",
                    toRecord(step.invoke).state === "done"
                      ? "bg-ui-fg-muted"
                      : "bg-ui-bg-switch-off"
                  )}
                />
              ))}
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              {progress.completed}/{progress.count}
            </Text>
          </div>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Timeline</Heading>
        </div>
        <div className="w-full overflow-hidden border-y">
          <div className="h-[360px] w-full overflow-auto bg-ui-bg-subtle">
            {steps.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <Text size="small" className="text-ui-fg-subtle">
                  No step data available for timeline.
                </Text>
              </div>
            ) : (
              <div className="relative min-h-full min-w-max bg-[radial-gradient(var(--border-base)_1.5px,transparent_0)] bg-[length:20px_20px] bg-repeat p-8">
                <div className="flex select-none items-start">
                  {Object.entries(timelineClusters)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([depth, cluster]) => {
                      const next = getNextCluster(timelineClusters, Number(depth))

                      return (
                        <div key={depth} className="flex items-start">
                          <div className="flex flex-col justify-center gap-y-2">
                            {cluster.map((step) => {
                              const stepId = step.id.split(".").pop() || step.id
                              return (
                                <a
                                  key={step.id}
                                  href={`#${stepId}`}
                                  className="focus-visible:shadow-borders-focus transition-fg rounded-md outline-none"
                                >
                                  <div className="bg-ui-bg-base shadow-borders-base flex min-w-[120px] items-center gap-x-0.5 rounded-md p-0.5">
                                    <div className="flex size-5 items-center justify-center">
                                      <div
                                        className={clx(
                                          "size-2 rounded-sm shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
                                          stepDotColor(step.invoke.state as string | undefined)
                                        )}
                                      />
                                    </div>
                                    <Text
                                      size="xsmall"
                                      leading="compact"
                                      weight="plus"
                                      className="select-none"
                                    >
                                      {stepId}
                                    </Text>
                                  </div>
                                </a>
                              )
                            })}
                          </div>
                          <Line next={next} />
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>

      {!!normalizedPayload && (
        <Container className="divide-y p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-x-4">
              <Heading level="h2">Payload</Heading>
              <Badge size="2xsmall" rounded="full">
                {payloadKeysCount} keys
              </Badge>
            </div>
            <JsonDrawerContent
              data={normalizedPayload}
              keysCount={payloadKeysCount}
              title="Payload"
            />
          </div>
        </Container>
      )}

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">History</Heading>
        </div>
        <div className="px-6 py-4">
          <div className="flex flex-col gap-y-1">
            {steps.map((step) => {
              const stepId = (step.id as string)?.split(".").pop() || step.id
              const invokeState = step.invoke.state as string | undefined
              const invokeStatus = step.invoke.status as string | undefined
              const contextData = toRecord(toRecord(workflow_execution.context).data)
              const invokeData = toRecord(contextData.invoke)
              const stepInvokeContext = toRecord(invokeData[stepId])
              const stepErrors = Array.isArray(toRecord(workflow_execution.context).errors)
                ? (toRecord(workflow_execution.context).errors as Record<string, unknown>[])
                : []
              const stepError = stepErrors.find((e) => e?.action === stepId)
              const isUnreachable = unreachableSteps.includes(step.id)

              return (
                <details key={step.id} id={stepId} className="rounded-md border p-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-x-2">
                    <div className="flex items-center gap-x-2">
                      <div className={clx("size-2 rounded-full", stepDotColor(invokeState))} />
                      <Text size="small" weight="plus">
                        {stepId}
                      </Text>
                    </div>
                    <Text size="small" className="text-ui-fg-subtle">
                      {isUnreachable
                        ? "-"
                        : invokeState === "invoking"
                          ? "Running"
                          : invokeState === "skipped"
                            ? "Skipped"
                            : invokeState === "skipped_failure"
                              ? "Skipped Failure"
                              : invokeState === "failed"
                                ? "Failed"
                                : step.startedAt
                                  ? formatDateTime(
                                      new Date(step.startedAt).toISOString()
                                    )
                                  : humanizeState(invokeStatus || invokeState)}
                    </Text>
                  </summary>
                  <div className="mt-3 grid gap-y-3">
                    <JsonInlineBlock label="Definition" value={step.definition || {}} />

                    {!!Object.keys(stepInvokeContext).length && (
                      <JsonInlineBlock
                        label="Output"
                        value={toRecord(toRecord(stepInvokeContext.output).output)}
                      />
                    )}

                    {!!toRecord(toRecord(stepInvokeContext.output).compensateInput) &&
                      toRecord(toRecord(step).compensate).state === "reverted" && (
                        <JsonInlineBlock
                          label="Compensation Input"
                          value={toRecord(toRecord(stepInvokeContext.output).compensateInput)}
                        />
                      )}

                    {!!stepError && (
                      <JsonInlineBlock
                        label="Error"
                        value={{
                          error: stepError.error,
                          handlerType: stepError.handlerType,
                        }}
                      />
                    )}
                  </div>
                </details>
              )
            })}
          </div>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-4">
            <Heading level="h2">JSON</Heading>
            <Badge size="2xsmall" rounded="full">
              {jsonKeysCount} keys
            </Badge>
          </div>
          <JsonDrawerContent
            data={workflow_execution as object}
            keysCount={jsonKeysCount}
            title="JSON"
          />
        </div>
      </Container>
    </div>
  )
}
