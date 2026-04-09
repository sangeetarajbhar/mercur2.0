import { ArrowDownTray } from "@medusajs/icons";
import { Text, clx } from "@medusajs/ui";
import { ChangeEvent, DragEvent, useRef, useState } from "react";

export interface FileType {
  id: string;
  url: string;
  file: File;
  base64Content?: string;
}

export interface FileUploadProps {
  label: string;
  multiple?: boolean;
  hint?: string;
  hasError?: boolean;
  formats: string[];
  onUploaded: (files: FileType[]) => void;
  uploadedImage?: string;
  includeBase64?: boolean;
  disabled?: boolean;
}

export const FileUpload = ({
  label,
  hint,
  multiple = true,
  hasError,
  formats,
  onUploaded,
  uploadedImage = "",
  includeBase64 = false,
  disabled = false,
}: FileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLButtonElement>(null);

  const handleOpenFileSelector = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled) {
      return;
    }

    if (event.dataTransfer?.files) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      !dropZoneRef.current ||
      dropZoneRef.current.contains(event.relatedTarget as Node)
    ) {
      return;
    }

    setIsDragOver(false);
  };

  const handleUploaded = async (files: FileList | null) => {
    if (!files || disabled) {
      return;
    }

    const fileObj = await Promise.all(
      Array.from(files).map(async (file) => {
        const id = Math.random().toString(36).slice(2);
        const previewUrl = URL.createObjectURL(file);

        let base64Content: string | undefined;
        if (includeBase64) {
          base64Content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
          });
        }

        return {
          id,
          url: previewUrl,
          file,
          base64Content,
        };
      })
    );

    onUploaded(fileObj);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (disabled) {
      return;
    }

    void handleUploaded(event.dataTransfer?.files);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleUploaded(event.target.files);
  };

  return (
    <div>
      <button
        ref={dropZoneRef}
        type="button"
        onClick={handleOpenFileSelector}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        disabled={disabled}
        className={clx(
          "bg-ui-bg-component border-ui-border-strong transition-fg group flex w-full flex-col items-center gap-y-2 rounded-lg border border-dashed p-8",
          "hover:border-ui-border-interactive focus:border-ui-border-interactive",
          "focus:shadow-borders-focus outline-none focus:border-solid",
          {
            "!border-ui-border-error": hasError,
            "!border-ui-border-interactive": isDragOver,
            "cursor-not-allowed opacity-50": disabled,
          }
        )}
      >
        {uploadedImage ? (
          <div>
            <img src={uploadedImage} className="h-32 w-32 rounded-md" />
          </div>
        ) : (
          <>
            <div className="text-ui-fg-subtle group-disabled:text-ui-fg-disabled flex items-center gap-x-2">
              <ArrowDownTray />
              <Text>{label}</Text>
            </div>
            {!!hint && (
              <Text
                size="small"
                leading="compact"
                className="text-ui-fg-muted group-disabled:text-ui-fg-disabled"
              >
                {hint}
              </Text>
            )}
          </>
        )}
      </button>
      <input
        hidden
        ref={inputRef}
        onChange={handleFileChange}
        type="file"
        accept={formats.join(",")}
        multiple={multiple}
        disabled={disabled}
      />
    </div>
  );
};
