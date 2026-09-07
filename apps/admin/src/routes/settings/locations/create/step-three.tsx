import { Input, ProgressAccordion, ProgressStatus } from "@medusajs/ui";
import { useCallback, useMemo } from "react";
import { useFormState, useWatch, UseFormReturn } from "react-hook-form";
import { FileType, FileUpload } from "../../../../components/common/file-upload/file-upload";
import { LocationCreateCustomFields } from "../components/location-custom-fields";
import { CreateLocationSchemaType, DOCUMENT_MAX_FILE_SIZE_BYTES } from "./schema";

type Props = { form: UseFormReturn<CreateLocationSchemaType> };

const SUPPORTED_FORMATS = ["application/pdf"];

const toDisplayFile = (value: unknown): FileType | null => {
  if (!value) return null;

  const fromUrl = (url: string): FileType => {
    const clean = url.split("?")[0];
    const fallbackName = "document.pdf";
    const name = clean.split("/").filter(Boolean).pop() || fallbackName;
    return {
      id: `existing-${name}`,
      url,
      file: { name, type: "application/pdf", size: 0 } as unknown as File,
    };
  };

  if (typeof value === "string") {
    return fromUrl(value);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const url =
      (record.url as string | undefined) ||
      (record.pdf_url as string | undefined) ||
      (record.pdfUrl as string | undefined);

    if (record.file && record.id && record.url) {
      return value as FileType;
    }

    if (url) {
      return fromUrl(url);
    }
  }

  return null;
};

const PDFFileDisplay = ({ file }: { file: FileType }) => {
  const getFileName = () => {
    if (file.file instanceof File) {
      return file.file.name;
    }
    return (file.file as { name?: string })?.name || "PDF Document";
  };

  const hasUrl = file.url && typeof file.url === "string";

  return (
    <div className="mt-2 rounded border p-2">
      <div className="flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <line x1="10" y1="9" x2="8" y2="9"></line>
        </svg>
        {hasUrl ? (
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {getFileName()}
          </a>
        ) : (
          <span className="text-sm font-medium">{getFileName()}</span>
        )}
      </div>
    </div>
  );
};

export const StepThree = ({ form }: Props) => {
  const panNumber = useWatch({ control: form.control, name: "pan_number" });
  const panPdf = useWatch({ control: form.control, name: "pan_pdf" });
  const gstNumber = useWatch({ control: form.control, name: "gst_number" });
  const gstPdf = useWatch({ control: form.control, name: "gst_pdf" });
  const fssaiNumber = useWatch({ control: form.control, name: "fssai_number" });
  const fssaiPdf = useWatch({ control: form.control, name: "fssai_pdf" });
  const { errors } = useFormState({ control: form.control });

  const getPanStatus = useMemo((): ProgressStatus => {
    const numberOk = Boolean(panNumber && String(panNumber).trim() !== "");
    const pdfOk = Array.isArray(panPdf) && panPdf.length > 0;
    const hasErrors = !!(errors.pan_number || errors.pan_pdf);
    return numberOk && pdfOk && !hasErrors ? "completed" : "in-progress";
  }, [panNumber, panPdf, errors.pan_number, errors.pan_pdf]);

  const getGstStatus = useMemo((): ProgressStatus => {
    const numberOk = Boolean(gstNumber && String(gstNumber).trim() !== "");
    const pdfOk = Array.isArray(gstPdf) && gstPdf.length > 0;
    const hasErrors = !!(errors.gst_number || errors.gst_pdf);
    return numberOk && pdfOk && !hasErrors ? "completed" : "in-progress";
  }, [gstNumber, gstPdf, errors.gst_number, errors.gst_pdf]);

  const getFssaiStatus = useMemo((): ProgressStatus => {
    const numberOk = Boolean(fssaiNumber && String(fssaiNumber).trim() !== "");
    const pdfOk = Array.isArray(fssaiPdf) && fssaiPdf.length > 0;
    const hasErrors = !!(errors.fssai_number || errors.fssai_pdf);
    return numberOk && pdfOk && !hasErrors ? "completed" : "in-progress";
  }, [fssaiNumber, fssaiPdf, errors.fssai_number, errors.fssai_pdf]);

  const hasInvalidFiles = useCallback(
    (fileList: FileType[], fieldName: "pan_pdf" | "gst_pdf" | "fssai_pdf") => {
      const invalidFile = fileList.find((f) => !SUPPORTED_FORMATS.includes(f.file.type));

      if (invalidFile) {
        form.setError(fieldName, {
          type: "invalid_file",
          message: "Only PDF files are allowed. Please upload a valid PDF document.",
        });
        return true;
      }

      const overSizedFile = fileList.find(
        (f) => f.file.size && f.file.size > DOCUMENT_MAX_FILE_SIZE_BYTES
      );

      if (overSizedFile) {
        form.setError(fieldName, {
          type: "file_too_large",
          message: "File size must not exceed 3 MB. Please upload a smaller PDF document.",
        });
        return true;
      }

      return false;
    },
    [form]
  );

  const createUploadHandler = useCallback(
    (fieldName: "pan_pdf" | "gst_pdf" | "fssai_pdf") => (files: FileType[]) => {
      form.clearErrors(fieldName);

      if (hasInvalidFiles(files, fieldName)) {
        form.setValue(fieldName, []);
        return;
      }

      form.setValue(fieldName, [files[0]], { shouldValidate: true });
    },
    [form, hasInvalidFiles]
  );

  const onPanUploaded = createUploadHandler("pan_pdf");
  const onGstUploaded = createUploadHandler("gst_pdf");
  const onFssaiUploaded = createUploadHandler("fssai_pdf");
  const panDisplayFile = toDisplayFile(panPdf?.[0]);
  const gstDisplayFile = toDisplayFile(gstPdf?.[0]);
  const fssaiDisplayFile = toDisplayFile(fssaiPdf?.[0]);

  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
        <div className="w-full px-4">
          <ProgressAccordion type="multiple">
            <ProgressAccordion.Item value="pan">
              <ProgressAccordion.Header status={getPanStatus}>PAN</ProgressAccordion.Header>
              <ProgressAccordion.Content>
                <div className="pb-6">
                  <label className="txt-compact-small-plus mb-1 block">Pan Number</label>
                  <Input size="small" {...form.register("pan_number")} />
                  {errors.pan_number?.message ? (
                    <p className="text-ui-fg-error mt-1 text-xs">{String(errors.pan_number.message)}</p>
                  ) : null}
                </div>
                <div className="pb-6">
                  <FileUpload
                    uploadedImage={undefined}
                    multiple={false}
                    label="Upload PAN Document (PDF only) of max 3Mb"
                    hint="Please upload a PDF document for PAN verification"
                    hasError={!!errors.pan_pdf}
                    formats={SUPPORTED_FORMATS}
                    includeBase64={true}
                    onUploaded={onPanUploaded}
                  />
                  {errors.pan_pdf?.message ? (
                    <p className="text-ui-fg-error mt-1 text-xs">{String(errors.pan_pdf.message)}</p>
                  ) : null}
                  {panDisplayFile ? <PDFFileDisplay file={panDisplayFile} /> : null}
                </div>
              </ProgressAccordion.Content>
            </ProgressAccordion.Item>

            <ProgressAccordion.Item value="gst">
              <ProgressAccordion.Header status={getGstStatus}>GST</ProgressAccordion.Header>
              <ProgressAccordion.Content>
                <div className="pb-6">
                  <label className="txt-compact-small-plus mb-1 block">GST Number</label>
                  <Input size="small" {...form.register("gst_number")} />
                  {errors.gst_number?.message ? (
                    <p className="text-ui-fg-error mt-1 text-xs">{String(errors.gst_number.message)}</p>
                  ) : null}
                </div>
                <div className="pb-6">
                  <FileUpload
                    uploadedImage={undefined}
                    multiple={false}
                    label="Upload GST Document (PDF only) of max 3Mb"
                    hint="Please upload a PDF document for GST verification"
                    hasError={!!errors.gst_pdf}
                    formats={SUPPORTED_FORMATS}
                    includeBase64={true}
                    onUploaded={onGstUploaded}
                  />
                  {errors.gst_pdf?.message ? (
                    <p className="text-ui-fg-error mt-1 text-xs">{String(errors.gst_pdf.message)}</p>
                  ) : null}
                  {gstDisplayFile ? <PDFFileDisplay file={gstDisplayFile} /> : null}
                </div>
              </ProgressAccordion.Content>
            </ProgressAccordion.Item>

            <ProgressAccordion.Item value="fssai">
              <ProgressAccordion.Header status={getFssaiStatus}>FSSAI</ProgressAccordion.Header>
              <ProgressAccordion.Content>
                <div className="pb-6">
                  <label className="txt-compact-small-plus mb-1 block">FSSAI Number</label>
                  <Input size="small" {...form.register("fssai_number")} />
                  {errors.fssai_number?.message ? (
                    <p className="text-ui-fg-error mt-1 text-xs">
                      {String(errors.fssai_number.message)}
                    </p>
                  ) : null}
                </div>
                <div className="pb-6">
                  <FileUpload
                    uploadedImage={undefined}
                    multiple={false}
                    label="Upload FSSAI Document (PDF only) of max 3Mb"
                    hint="Please upload a PDF document for FSSAI verification"
                    hasError={!!errors.fssai_pdf}
                    formats={SUPPORTED_FORMATS}
                    includeBase64={true}
                    onUploaded={onFssaiUploaded}
                  />
                  {errors.fssai_pdf?.message ? (
                    <p className="text-ui-fg-error mt-1 text-xs">{String(errors.fssai_pdf.message)}</p>
                  ) : null}
                  {fssaiDisplayFile ? <PDFFileDisplay file={fssaiDisplayFile} /> : null}
                </div>
              </ProgressAccordion.Content>
            </ProgressAccordion.Item>
          </ProgressAccordion>
        </div>

        <div className="px-4">
          <LocationCreateCustomFields form={form} />
        </div>
      </div>
    </div>
  );
};
