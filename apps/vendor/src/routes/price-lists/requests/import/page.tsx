import { Button, Heading, Text, toast } from "@medusajs/ui"
import { Trash } from "@medusajs/icons"
import { useMemo, useState } from "react"
import {
  FilePreview,
  FileUpload,
  type FileType,
  RouteDrawer,
  useRouteModal,
} from "@mercurjs/dashboard-shared"
import { useImportPriceList } from "../../../../hooks/api/price-list-requests"

const getFlatAmountCsvTemplate = () => {
  const csv =
    "data:text/csv;charset=utf-8," +
    `starts_at;ends_at;sku;flat_amount\n2025-06-01;2025-08-31;bear-black;989\n2025-06-01;2025-08-31;abc-2;1989\n2025-07-01;2025-12-31;abc-1;89\n2025-07-01;2025-12-31;abc-6;189\n2025-07-02;2026-01-01;abc-3;289\n`
  return encodeURI(csv)
}

const getPercentageDiscountCsvTemplate = () => {
  const csv =
    "data:text/csv;charset=utf-8," +
    `starts_at;ends_at;sku;percentage_discount\n2025-06-01;2025-08-31;bear-black;15\n2025-06-01;2025-08-31;abc-2;10\n2025-07-01;2025-12-31;abc-1;12\n2025-07-01;2025-12-31;abc-6;14\n2025-07-02;2026-01-01;abc-3;20\n`
  return encodeURI(csv)
}

const SUPPORTED_FORMATS = ["text/csv"]

const PriceListImportContent = () => {
  const [filename, setFilename] = useState<string | undefined>()
  const [importStatus, setImportStatus] = useState<"idle" | "uploading" | "error">("idle")
  const { mutateAsync: importPriceList, isPending } = useImportPriceList()
  const { handleSuccess } = useRouteModal()

  const flatAmountTemplate = useMemo(() => getFlatAmountCsvTemplate(), [])
  const percentageTemplate = useMemo(() => getPercentageDiscountCsvTemplate(), [])

  const handleUploaded = async (files: FileType[]) => {
    const file = files[0]?.file
    if (!file) return
    setFilename(file.name)
    setImportStatus("uploading")
    try {
      await importPriceList(file, {
        onSuccess: () => {
          setImportStatus("idle")
          toast.info("Import queued", {
            description: "You'll be notified when the import is complete.",
          })
          handleSuccess()
        },
        onError: (err) => {
          setImportStatus("error")
          toast.error(err.message || "Import failed")
          setFilename(undefined)
        },
      })
    } catch (err: any) {
      setImportStatus("error")
      toast.error(err?.message || "Unexpected error during import")
      setFilename(undefined)
    }
  }

  const uploadedFileActions = [
    {
      actions: [
        {
          label: "Delete",
          icon: <Trash />,
          onClick: () => {
            setFilename(undefined)
            setImportStatus("idle")
          },
        },
      ],
    },
  ]

  return (
    <>
      <RouteDrawer.Body>
        <Heading level="h2">Upload CSV</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Upload a CSV file to import your price list.
        </Text>
        <div className="mt-4">
          {filename ? (
            <FilePreview
              filename={filename}
              loading={isPending || importStatus === "uploading"}
              activity="Uploading..."
              actions={importStatus === "error" ? [] : uploadedFileActions}
            />
          ) : (
            <FileUpload
              label="Upload CSV"
              hint="Only .csv files are supported. Max 10MB."
              multiple={false}
              formats={SUPPORTED_FORMATS}
              onUploaded={handleUploaded}
            />
          )}
        </div>

        <Heading className="mt-6" level="h2">
          Templates
        </Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Download a template to see the required format.
        </Text>
        <div className="mt-4">
          <FilePreview
            filename="price-lists-flat-amount-import-template.csv"
            url={flatAmountTemplate}
          />
        </div>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Sample file for Flat amount template
        </Text>
        <div className="mt-4">
          <FilePreview
            filename="price-lists-percentage-based-import-template.csv"
            url={percentageTemplate}
          />
        </div>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Sample file for Percentage based template
        </Text>
      </RouteDrawer.Body>
      <RouteDrawer.Footer>
        <div className="flex items-center gap-x-2">
          <RouteDrawer.Close asChild>
            <Button size="small" variant="secondary">
              Cancel
            </Button>
          </RouteDrawer.Close>
        </div>
      </RouteDrawer.Footer>
    </>
  )
}

const PriceListImportDrawer = () => {
  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>Import Price List</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          Upload a CSV to import price list
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <PriceListImportContent />
    </RouteDrawer>
  )
}

export default PriceListImportDrawer
