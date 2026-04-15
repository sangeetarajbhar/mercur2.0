import { ArrowDownTray } from "@medusajs/icons"
import { Text, clx } from "@medusajs/ui"
import { ChangeEvent, DragEvent, useRef, useState } from "react"

export interface FileType {
  id: string
  url: string
  file: File
  base64Content?: string // Optional base64 content for S3 uploads
}

export interface FileUploadProps {
  label: string
  multiple?: boolean
  hint?: string
  hasError?: boolean
  formats: string[]
  onUploaded: (files: FileType[]) => void
  uploadedImage?: string
  includeBase64?: boolean // New optional prop to enable base64 conversion
  disabled?: boolean // Disable file upload (e.g., during upload in progress)
}

export const FileUpload = ({
  label,
  hint,
  multiple = true,
  hasError,
  formats,
  onUploaded,
  uploadedImage = "",
  includeBase64 = false, // Default false for backward compatibility
  disabled = false, // Default false for backward compatibility
}: FileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLButtonElement>(null)

  const handleOpenFileSelector = () => {
    if (disabled) {
      return
    }
    inputRef.current?.click()
  }

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (disabled) {
      return
    }

    const files = event.dataTransfer?.files
    if (!files) {
      return
    }

    setIsDragOver(true)
  }

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (
      !dropZoneRef.current ||
      dropZoneRef.current.contains(event.relatedTarget as Node)
    ) {
      return
    }

    setIsDragOver(false)
  }

  const handleUploaded = async (files: FileList | null) => {
    if (!files || disabled) {
      return
    }

    const fileList = Array.from(files)
    
    // Process files with optional base64 conversion
    const fileObj = await Promise.all(
      fileList.map(async (file) => {
        const id = Math.random().toString(36).substring(7)
        const previewUrl = URL.createObjectURL(file)
        
        // Only convert to base64 if explicitly requested
        let base64Content: string | undefined = undefined
        if (includeBase64) {
          base64Content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
              // console.log("Base64 generated, length:", (reader.result as string).length)
              resolve(reader.result as string)
            }
            reader.onerror = (error) => {
              console.error("Base64 conversion error:", error)
              reject(error)
            }
          })
        } else {
          console.log("includeBase64 is false, skipping conversion")
        }

        const result = {
          id: id,
          url: previewUrl,
          file, // Keep original File object for backward compatibility
          base64Content, // Add base64 content only when requested
        }
        return result
      })
    )

    onUploaded(fileObj)
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    setIsDragOver(false)

    if (disabled) {
      return
    }

    handleUploaded(event.dataTransfer?.files)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    handleUploaded(event.target.files)
  }

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
            "opacity-50 cursor-not-allowed": disabled,
          }
        )}
      >
        {uploadedImage ? (
          <div>
            <img src={uploadedImage} className="w-32 h-32 rounded-md" />
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
  )
}
