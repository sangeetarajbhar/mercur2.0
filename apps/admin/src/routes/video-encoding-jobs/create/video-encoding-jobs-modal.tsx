import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  toast,
  FocusModal,
  Select,
  Heading,
  Label,
  Text,
} from "@medusajs/ui";
import { FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  CreateVideoEncodingJobsSchema,
  CreateVideoEncodingJobsSchemaType,
} from "./schema";
import { referenceTypeMap, VideoMaxFileSize, VideoMaxFileSizeInMb } from "../types";
import {
  useCreateVideoEncodingJobs,
  useGetPresignedUrl,
} from "../../../hooks/api/video-encoding-jobs";
import {
  FileType,
  FileUpload,
} from "../../../components/common/file-upload/file-upload";
import { useCallback, useState } from "react";

interface VideoEncodingJobsFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Supported video formats
const SUPPORTED_FORMATS = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

const VideoFileDisplay = ({ file }: { file: FileType | string }) => {
  if (typeof file === "string") {
    return (
      <div className="mt-2 border rounded p-2">
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          <span className="text-sm font-medium">{file}</span>
        </div>
      </div>
    );
  }

  const getFileName = () => {
    if (file.file instanceof File) {
      return file.file.name;
    }
    if (file.file && typeof file.file === "object") {
      const fileObj = file.file as { name?: string };
      return fileObj.name || "Video file";
    }
    return "Video file";
  };

  const hasUrl = file.url && typeof file.url === "string";

  return (
    <div className="mt-2 border rounded p-2">
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
        {hasUrl ? (
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
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

const VideoEncodingJobsModal = ({
  open,
  onOpenChange,
}: VideoEncodingJobsFormModalProps) => {
  const { t } = useTranslation();

  const getDefaultValues = (): Partial<CreateVideoEncodingJobsSchemaType> => {
    return {
      reference_type: undefined,
      file_name: [],
    };
  };

  const form = useForm<CreateVideoEncodingJobsSchemaType>({
    defaultValues: getDefaultValues(),
    resolver: zodResolver(CreateVideoEncodingJobsSchema),
  });

  const { mutateAsync: getPresignedUrl } = useGetPresignedUrl();
  const { mutateAsync: createVideoEncodingJobs, isPending: isCreating } =
    useCreateVideoEncodingJobs();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedS3Data, setUploadedS3Data] = useState<{
    s3_path: string;
    file_name: string;
    encoding_job_id: string;
  } | null>(null);
  const isLoading = isCreating || isUploading;

  const handleClose = () => {
    form.reset();
    setUploadedS3Data(null);
    onOpenChange(false);
  };

  const hasInvalidFiles = useCallback(
    (fileList: FileType[]) => {
      const invalidFile = fileList.find(
        (f) => !SUPPORTED_FORMATS.includes(f.file.type)
      );

      if (invalidFile) {
        form.setError("file_name", {
          type: "invalid_file",
          message:
            "Invalid video format. Supported formats: .mp4, .webm, .mov, .avi, .mkv",
        });
        return true;
      }

      const overSizedFile = fileList.find(
        (f) => f.file.size && f.file.size > VideoMaxFileSize
      );

      if (overSizedFile) {
        form.setError("file_name", {
          type: "file_too_large",
          message: `File size must not exceed ${VideoMaxFileSizeInMb} MB. Please upload a smaller video.`,
        });
        return true;
      }

      return false;
    },
    [form]
  );

  const onVideoUploaded = useCallback(
    async (files: FileType[]) => {
      form.clearErrors("file_name");

      if (hasInvalidFiles(files)) {
        form.setValue("file_name", []);
        setUploadedS3Data(null);
        return;
      }

      const file = files[0].file;
      if (!(file instanceof File)) {
        console.error("&&&&&& Expected File object");
        return;
      }

      const referenceType = form.getValues("reference_type");
      if (!referenceType) {
        form.setError("reference_type", {
          type: "required",
          message:
            "Please select a reference type before uploading the video.",
        });
        form.setValue("file_name", []);
        return;
      }

      try {
        setIsUploading(true);

        toast.info(
          "Uploading video file. Please wait, this may take some time depending on file size..."
        );

        const presignedData = await getPresignedUrl({
          reference_type: referenceType,
          file_name: file.name,
          file_type: file.type,
        });

        const uploadResponse = await fetch(presignedData.presigned_url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("&&&&&& S3 upload failed:", {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            error: errorText,
          });

          if (
            uploadResponse.status === 0 ||
            uploadResponse.statusText === ""
          ) {
            throw new Error(
              "CORS error: S3 bucket is not configured to allow uploads from this origin. " +
                "Please configure CORS on your S3 bucket to allow PUT requests from your frontend domain."
            );
          }

          throw new Error(
            `Failed to upload to S3: ${uploadResponse.status} ${uploadResponse.statusText}`
          );
        }

        setUploadedS3Data({
          s3_path: presignedData.s3_path,
          file_name: presignedData.file_name,
          encoding_job_id: presignedData.encoding_job_id,
        });

        form.setValue("file_name", [
          {
            file: {
              name: file.name,
              size: file.size,
              type: file.type,
            },
            url: URL.createObjectURL(file),
          },
        ]);

        toast.success(`Video "${file.name}" uploaded successfully!`);
      } catch (error) {
        console.error("&&&&&& Error uploading video to S3:", error);
        form.setError("file_name", {
          type: "upload_error",
          message: `Failed to upload video: ${(error as Error).message}`,
        });
        form.setValue("file_name", []);
        setUploadedS3Data(null);
      } finally {
        setIsUploading(false);
      }
    },
    [form, hasInvalidFiles, getPresignedUrl]
  );

  return (
    <>
      <FormProvider {...form}>
        <form id={"video-encoding-jobs-form"}>
          <FocusModal open={open} onOpenChange={handleClose}>
            <FocusModal.Content>
              <FocusModal.Header>
                <Heading className="capitalize">{"Create"}</Heading>
              </FocusModal.Header>

              <FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
                <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
                  <div>
                    <Heading className="capitalize mb-2">
                      Video Encoding
                    </Heading>
                  </div>

                  <div className="flex flex-col gap-y-6">
                    <div className="flex flex-col gap-y-2">
                      <Label
                        htmlFor="reference_type"
                        className="text-ui-fg-subtle text-small font-medium"
                      >
                        Reference Type *
                      </Label>
                      <Select
                        size="small"
                        value={form.watch("reference_type") || ""}
                        onValueChange={(value) => {
                          form.setValue("reference_type", value as "CMS" | "CATALOG");
                          form.clearErrors("reference_type");
                        }}
                        disabled={isLoading}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Select Reference Type" />
                        </Select.Trigger>
                        <Select.Content>
                          {Object.entries(referenceTypeMap).map(
                            ([id, name]) => (
                              <Select.Item key={id} value={id}>
                                {name}
                              </Select.Item>
                            )
                          )}
                        </Select.Content>
                      </Select>
                      {form.formState.errors.reference_type && (
                        <Text
                          className="text-small"
                          style={{ color: "#ef4444" }}
                        >
                          {form.formState.errors.reference_type.message}
                        </Text>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-y-6">
                    <div className="flex flex-col gap-y-2">
                      <FileUpload
                        uploadedImage={undefined}
                        multiple={false}
                        label="Upload Video (.mp4, .webm, .mov, .avi, .mkv) of max 20MB"
                        hint="Please upload a video file"
                        hasError={!!form.formState.errors.file_name}
                        formats={SUPPORTED_FORMATS}
                        includeBase64={false}
                        disabled={isUploading}
                        onUploaded={onVideoUploaded}
                      />
                      {isUploading && (
                        <div className="mt-2 flex items-center gap-x-2 text-sm text-ui-fg-muted">
                          <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>
                            Uploading video to S3... Please wait, this may take
                            some time depending on file size.
                          </span>
                        </div>
                      )}
                      {form.formState.errors.file_name && (
                        <Text
                          className="text-small"
                          style={{ color: "#ef4444" }}
                        >
                          {(form.formState.errors.file_name as any)?.message}
                        </Text>
                      )}
                      {form.watch("file_name") &&
                        form.watch("file_name").length > 0 &&
                        (() => {
                          const firstFile = form.watch("file_name")[0];
                          if (
                            typeof firstFile === "object" &&
                            "file" in firstFile
                          ) {
                            return (
                              <VideoFileDisplay
                                file={firstFile as FileType}
                              />
                            );
                          }
                          return <VideoFileDisplay file={firstFile} />;
                        })()}
                    </div>
                  </div>
                </div>
              </FocusModal.Body>

              <FocusModal.Footer>
                <div className="flex items-center justify-end gap-x-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    {t("actions.cancel")}
                  </Button>
                  <Button
                    size="small"
                    type="button"
                    isLoading={isLoading}
                    onClick={async () => {
                      const isValid = await form.trigger();

                      if (isValid) {
                        if (!uploadedS3Data) {
                          toast.error("Please upload a video file first");
                          return;
                        }

                        const values = form.getValues();

                        try {
                          const submitValues = {
                            reference_type: values.reference_type,
                            s3_path: uploadedS3Data.s3_path,
                            file_name: uploadedS3Data.file_name,
                            encoding_job_id: uploadedS3Data.encoding_job_id,
                          };

                          await createVideoEncodingJobs(submitValues);
                          toast.success(
                            "Video encoding job created successfully"
                          );

                          form.reset();
                          setUploadedS3Data(null);
                          onOpenChange(false);
                        } catch (err) {
                          const message =
                            (err as Error)?.message ||
                            "Failed to create video encoding job";
                          toast.error(message);
                        }
                      } else {
                        toast.error(
                          "Please fix the form errors before submitting"
                        );
                      }
                    }}
                  >
                    {"Create"}
                  </Button>
                </div>
              </FocusModal.Footer>
            </FocusModal.Content>
          </FocusModal>
        </form>
      </FormProvider>
    </>
  );
};

export default VideoEncodingJobsModal;
