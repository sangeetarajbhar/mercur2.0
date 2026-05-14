import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadToS3WithPath } from "../../../../shared/utils/common"

const VALID_KYC_TYPES = [
  "PAN",
  "TAN",
  "NOODLE_LETTER",
  "SIGNATURE",
  "COI",
  "INVOICE_GUIDELINE",
  "CANCELLED_CHEQUE",
  "AGREEMENT",
  "TRADEMARK",
  "SIN_NUMBER",
  "GST_CERTIFICATE",
  "MSME_CERTIFICATE",
  "OTHERS",
]

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const file = (req as any).file
  const { seller_name, doc_type, type, base64_content, file_name, mime_type } = req.body as {
    seller_name?: string
    doc_type?: string
    type?: "member" | "kyc"
    base64_content?: string
    file_name?: string
    mime_type?: string
  }

  if (!seller_name) {
    return res.status(400).json({ url: "", file_path: "", message: "seller_name is required" })
  }

  if (!file && !base64_content) {
    return res.status(400).json({
      url: "",
      file_path: "",
      message: "Either file (multipart) or base64_content (JSON) must be provided",
    })
  }

  try {
    let fileBuffer: Buffer
    let fileMimeType: string = "application/octet-stream"
    let fileExtension: string = "bin"

    if (base64_content) {
      const base64Data = base64_content.includes(",") ? base64_content.split(",")[1] : base64_content

      if (base64_content.includes("data:") && base64_content.includes(";base64,")) {
        const mimeMatch = base64_content.match(/data:([^;]+);base64,/)
        if (mimeMatch?.[1]) {
          fileMimeType = mimeMatch[1]
        }
      }

      fileBuffer = Buffer.from(base64Data, "base64")

      if (fileMimeType && fileMimeType !== "application/octet-stream") {
        const mimeToExt: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/jpg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "application/pdf": "pdf",
          "application/msword": "doc",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        }
        fileExtension = mimeToExt[fileMimeType] || "bin"
      } else if (file_name && file_name.includes(".")) {
        fileExtension = file_name.split(".").pop()?.toLowerCase() || "bin"
      }

      fileMimeType = fileMimeType || mime_type || "application/octet-stream"
    } else if (file) {
      fileBuffer = Buffer.isBuffer(file.buffer) ? file.buffer : Buffer.from(file.buffer)
      fileMimeType = file.mimetype || mime_type || "application/octet-stream"
      const originalName = file.originalname || file_name || "file"
      fileExtension = originalName.includes(".") ? originalName.split(".").pop()?.toLowerCase() || "bin" : "bin"
    } else {
      return res.status(400).json({ url: "", file_path: "", message: "No file data provided" })
    }

    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const fullDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`
    const sellerName = seller_name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")

    let fileNameWithPath: string

    if (type === "member") {
      fileNameWithPath = `documents/sellers/${yearMonth}/member/${sellerName}_member_${fullDate}.${fileExtension}`
    } else if (doc_type) {
      const docTypeUpper = doc_type.toUpperCase()
      if (!VALID_KYC_TYPES.includes(docTypeUpper)) {
        return res.status(400).json({
          url: "",
          file_path: "",
          message: `Invalid doc_type. Must be one of: ${VALID_KYC_TYPES.join(", ")}`,
        })
      }
      const docTypeLower = doc_type.toLowerCase()
      fileNameWithPath = `documents/sellers/${yearMonth}/${docTypeLower}/${sellerName}_${docTypeLower}_${fullDate}.${fileExtension}`
    } else {
      return res
        .status(400)
        .json({ url: "", file_path: "", message: 'Either type="member" or doc_type must be provided' })
    }

    const fileUrl = await uploadToS3WithPath(fileNameWithPath, fileBuffer, fileMimeType)

    return res.status(200).json({
      url: fileUrl,
      file_path: fileNameWithPath,
      message: "File uploaded successfully",
    })
  } catch (error: any) {
    return res.status(500).json({
      url: "",
      file_path: "",
      message: `Failed to upload file: ${error?.message || String(error)}`,
    })
  }
}

