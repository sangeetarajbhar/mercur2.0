import { useState } from "react";
import { Hint } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { FileUpload, type FileType } from "./file-upload";

const SUPPORTED_FORMATS = ["text/csv"];
const SUPPORTED_EXTENSIONS = [".csv"];

export const UploadImport = ({ onUploaded }: { onUploaded: (file: File) => void }) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string>();

  const hasInvalidFiles = (files: FileType[]) => {
    const invalid = files.find((entry) => !SUPPORTED_FORMATS.includes(entry.file.type));

    if (!invalid) {
      return false;
    }

    setError(
      t("products.media.invalidFileType", {
        name: invalid.file.name,
        types: SUPPORTED_EXTENSIONS.join(", "),
      })
    );
    return true;
  };

  return (
    <div className="flex flex-col gap-y-4">
      <FileUpload
        label={t("products.import.uploadLabel")}
        hint={t("products.import.uploadHint")}
        multiple={false}
        formats={SUPPORTED_FORMATS}
        hasError={!!error}
        onUploaded={(files) => {
          setError(undefined);
          if (hasInvalidFiles(files)) {
            return;
          }
          onUploaded(files[0].file);
        }}
      />

      {error ? (
        <div>
          <Hint variant="error">{error}</Hint>
        </div>
      ) : null}
    </div>
  );
};
