import { Trash } from "@medusajs/icons"
import { Button, Input, Text, toast } from "@medusajs/ui"
import { useMemo, useRef, useState } from "react"

function resolveFileHref(url: string): string {
  const u = url.trim()
  if (!u) return ""
  if (/^https?:\/\//i.test(u)) return u
  if (typeof window !== "undefined") {
    const origin = window.location.origin
    return u.startsWith("/") ? `${origin}${u}` : `${origin}/${u}`
  }
  return u
}

function isLikelyImageUrl(url: string): boolean {
  const u = url.split("?")[0]?.toLowerCase() ?? ""
  return /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(u)
}

interface FileUploadButtonProps {
  onUploaded: (url: string) => void
  onRemove?: () => void
  currentUrl?: string | null
  label?: string
  accept?: string
  sellerName: string
  docType?: string
  uploadType?: "member" | "kyc"
}

export const FileUploadButton = ({
  onUploaded,
  onRemove,
  currentUrl,
  label = "Upload File",
  accept = "image/*,application/pdf",
  sellerName,
  docType,
  uploadType,
}: FileUploadButtonProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const href = useMemo(() => (currentUrl ? resolveFileHref(currentUrl) : ""), [currentUrl])
  const showImagePreview = Boolean(currentUrl && isLikelyImageUrl(currentUrl))

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!sellerName) {
      toast.error("Please enter seller name first")
      return
    }

    setIsUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64Content = reader.result as string
          const requestBody: Record<string, string> = {
            seller_name: sellerName,
            base64_content: base64Content,
            file_name: file.name,
            mime_type: file.type,
          }

          if (uploadType === "member") {
            requestBody.type = "member"
          } else if (docType) {
            requestBody.doc_type = docType
          } else {
            throw new Error("Either doc_type or type must be provided")
          }

          const response = await fetch("/admin/sellers/uploads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            credentials: "include",
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.message || "Upload failed")
          }

          const data = await response.json()
          const fileUrl = data.url || data.file_path
          if (fileUrl) {
            onUploaded(fileUrl)
            toast.success("File uploaded successfully")
          } else {
            throw new Error("No file URL returned from upload")
          }
        } catch (error: any) {
          toast.error(error.message || "Failed to upload file")
        } finally {
          setIsUploading(false)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }
      }
      reader.onerror = () => {
        toast.error("Failed to read file")
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file")
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? "Uploading..." : label}
        </Button>
        {currentUrl && onRemove && (
          <Button
            type="button"
            variant="transparent"
            size="small"
            onClick={onRemove}
            className="text-ui-fg-subtle hover:text-ui-fg-base"
            title="Remove file"
          >
            <Trash />
          </Button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileSelect}
      />
      {currentUrl && (
        <div className="flex flex-col gap-2">
          <Input size="small" value={currentUrl} readOnly className="text-xs font-mono" />
          {href && (
            <Text size="small">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ui-fg-interactive hover:underline"
              >
                Open file
              </a>
            </Text>
          )}
          {showImagePreview && href && (
            <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block max-w-full">
              <img
                src={href}
                alt="Uploaded file preview"
                className="max-h-40 max-w-full rounded-md border border-ui-border-base object-contain"
              />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

