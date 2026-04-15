import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { uploadFileWorkflow } from "../../../workflows/uploads/upload-file-workflow";

export const POST = async (
  req: AuthenticatedMedusaRequest<{
    file_name: string;
    content: string;
    mime_type?: string;
  }>,
  res: MedusaResponse<{
    url: string;
    file_path: string;
    message: string;
  }>
) => {
  const { file_name, content, mime_type } = req.validatedBody;

  // Validate required fields
  if (!file_name || !content) {
    return res.status(400).json({
      url: "",
      file_path: "",
      message: "file_name and content are required"
    });
  }

  try {
    // Execute the upload workflow
    const { result } = await uploadFileWorkflow(req.scope).run({
      input: {
        file_name,
        content,
        mime_type: mime_type || 'application/octet-stream'
      }
    });

    return res.status(200).json({
      url: result.url,
      file_path: result.file_path,
      message: "File uploaded successfully"
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({
      url: "",
      file_path: "",
      message: `Failed to upload file: ${(error as Error).message}`
    });
  }
};
