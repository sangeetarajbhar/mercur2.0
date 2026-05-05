import { ArrowDownTray, Trash } from "@medusajs/icons";
import {
  Button,
  Drawer,
  Heading,
  IconButton,
  Select,
  Text,
  toast,
} from "@medusajs/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAdminSellers,
  useConfirmEnhancedImportProducts,
  useEnhancedImportProducts,
} from "../../../hooks/api/products";
import { ImportSummary } from "./components/import-summary";
import { UploadImport } from "./components/upload-import";

type EnhancedProductImportProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
};

const getProductImportCsvTemplate = () => {
  const rows = [
    "title,handle,status,sku,variant_title,price,seller_id",
    "Sample Product,sample-product,published,SKU-001,Default Variant,999,seller_123",
  ];
  return `data:text/csv;charset=utf-8,${encodeURIComponent(rows.join("\n"))}`;
};

export const EnhancedProductImport = ({
  open,
  onOpenChange,
  onImported,
}: EnhancedProductImportProps) => {
  const { t } = useTranslation();
  const [filename, setFilename] = useState<string>();
  const [file, setFile] = useState<File>();
  const [selectedSeller, setSelectedSeller] = useState("");

  const { data: sellersData, isLoading: sellersLoading } = useAdminSellers();
  const sellers = sellersData?.sellers ?? [];

  const {
    mutateAsync: importProducts,
    isPending: isImporting,
    data: importResponse,
  } = useEnhancedImportProducts();
  const { mutateAsync: confirmImport, isPending: isConfirming } = useConfirmEnhancedImportProducts();

  const templateUrl = useMemo(() => getProductImportCsvTemplate(), []);

  const handleUploaded = async (uploadedFile: File) => {
    if (!selectedSeller) {
      toast.error("Please select a seller before uploading");
      return;
    }

    setFilename(uploadedFile.name);
    setFile(uploadedFile);

    try {
      await importProducts({ file: uploadedFile, sellerId: selectedSeller });
    } catch (error) {
      setFilename(undefined);
      setFile(undefined);
      toast.error(error instanceof Error ? error.message : "Failed to import file");
    }
  };

  const handleConfirm = async () => {
    const transactionId = importResponse?.transaction_id;
    if (!transactionId) {
      return;
    }

    try {
      await confirmImport(transactionId);
      toast.success(t("products.import.success.title"), {
        description: t("products.import.success.description"),
      });
      onOpenChange(false);
      setFilename(undefined);
      setFile(undefined);
      setSelectedSeller("");
      onImported?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to confirm import");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="!right-0 !w-1/3">
        <Drawer.Header>
          <Drawer.Title>Import Product List - Enhanced</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="h-full overflow-y-auto">
          <div className="flex flex-col gap-4 px-4 pb-6">
            <div>
              <Heading level="h2">Upload a CSV file</Heading>
              <Text size="small" className="text-ui-fg-subtle mt-2">
                Through imports you can add or update products. To update existing products
                you must use the existing handle and ID. To update existing variants you must
                use the existing ID.
              </Text>
            </div>

            <div>
              <Heading level="h3" className="mb-2">
                Select Seller
              </Heading>
              <Text size="small" className="text-ui-fg-subtle mb-2">
                Choose the seller for this import
              </Text>
              <Select
                value={selectedSeller}
                onValueChange={setSelectedSeller}
                disabled={sellersLoading}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select a seller..." />
                </Select.Trigger>
                <Select.Content>
                  {sellers.map((seller) => (
                    <Select.Item key={seller.id} value={seller.id}>
                      {seller.name || seller.id}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            <div>
              {filename && file ? (
                <div className="border border-ui-border-base rounded-md p-3 flex items-center justify-between">
                  <div>
                    <Text size="small" weight="plus">
                      {filename}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {isImporting ? "Pre-processing..." : "Uploaded"}
                    </Text>
                  </div>
                  <IconButton
                    size="small"
                    variant="transparent"
                    onClick={() => {
                      setFilename(undefined);
                      setFile(undefined);
                    }}
                  >
                    <Trash />
                  </IconButton>
                </div>
              ) : (
                <UploadImport onUploaded={handleUploaded} />
              )}
            </div>

            {importResponse?.summary && filename ? (
              <ImportSummary summary={importResponse.summary} />
            ) : null}

            <div>
              <Heading level="h3">Unsure about how to arrange your list?</Heading>
              <Text size="small" className="text-ui-fg-subtle mt-1">
                Download the template below to ensure you are following the correct format.
              </Text>
              <div className="mt-3 border border-ui-border-base rounded-md p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Text size="xsmall" className="uppercase text-ui-fg-subtle">
                    CSV
                  </Text>
                  <a className="text-ui-fg-base txt-compact-small-plus" href={templateUrl} download="product-import-template.csv">
                    product-import-template.csv
                  </a>
                </div>
                <Button size="small" variant="secondary" asChild>
                  <a href={templateUrl} download="product-import-template.csv">
                    <ArrowDownTray />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center gap-2">
            <Button size="small" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="small"
              onClick={handleConfirm}
              disabled={!importResponse?.transaction_id || !filename}
              isLoading={isConfirming}
            >
              Import
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
};
