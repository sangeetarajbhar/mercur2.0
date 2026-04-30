import { ArrowDownTray } from "@medusajs/icons";
import { Text, clx } from "@medusajs/ui";
import { type ChangeEvent, type DragEvent, useRef, useState } from "react";

export interface FileType {
  id: string;
  file: File;
}

type FileUploadProps = {
  label: string;
  hint?: string;
  multiple?: boolean;
  formats: string[];
  hasError?: boolean;
  disabled?: boolean;
  onUploaded: (files: FileType[]) => void;
};

export const FileUpload = ({
  label,
  hint,
  multiple = false,
  formats,
  hasError,
  disabled = false,
  onUploaded,
}: FileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLButtonElement>(null);

  const handleUploaded = (files: FileList | null) => {
    if (!files || disabled) {
      return;
    }

    const mapped = Array.from(files).map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
    }));

    onUploaded(mapped);
  };

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!dropZoneRef.current || dropZoneRef.current.contains(event.relatedTarget as Node)) {
      return;
    }

    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    handleUploaded(event.dataTransfer?.files ?? null);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleUploaded(event.target.files);
  };

  return (
    <div>
      <button
        ref={dropZoneRef}
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={clx(
          "bg-ui-bg-component border-ui-border-strong transition-fg group flex w-full flex-col items-center gap-y-2 rounded-lg border border-dashed p-8",
          "hover:border-ui-border-interactive focus:border-ui-border-interactive",
          "focus:shadow-borders-focus outline-none focus:border-solid",
          {
            "!border-ui-border-error": hasError,
            "!border-ui-border-interactive": isDragOver,
            "opacity-50 cursor-not-allowed": disabled,
          }
        )}
      >
        <div className="text-ui-fg-subtle flex items-center gap-x-2">
          <ArrowDownTray />
          <Text>{label}</Text>
        </div>
        {hint ? (
          <Text size="small" leading="compact" className="text-ui-fg-muted">
            {hint}
          </Text>
        ) : null}
      </button>
      <input
        hidden
        ref={inputRef}
        type="file"
        accept={formats.join(",")}
        multiple={multiple}
        onChange={handleInputChange}
      />
    </div>
  );
};
