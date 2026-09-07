import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { uploadToS3WithPath } from "../../../shared/utils/common";

type UploadFileInput = {
  file_name: string;
  content: string; // base64 encoded content
  mime_type?: string;
};

type UploadFileOutput = {
  url: string;
  file_path: string;
};

export const uploadFileToS3Step = createStep(
  "upload-file-to-s3-step",
  async (input: UploadFileInput) => {
    const { file_name, content, mime_type = 'application/octet-stream' } = input;

    // Get current date in dd-mm-yyyy format
    const currentDate = new Date();
    const day = String(currentDate.getDate()).padStart(2, '0');
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = currentDate.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    // Construct the file path
    const filePath = `returns/${formattedDate}/${file_name}`;

    // Convert base64 content to Buffer
    const buffer = Buffer.from(content, 'base64');

    // Upload to S3
    const url = await uploadToS3WithPath(filePath, buffer, mime_type);

    return new StepResponse(
      {
        url,
        file_path: filePath
      },
      {
        // Compensation data if we need to rollback
        file_path: filePath
      }
    );
  },
  async (compensateInput: { file_path: string }) => {
    // TODO: Implement file deletion if needed for rollback
    // For now, we'll leave files on S3 as they might be referenced
    console.log(`Compensation: Would delete file at ${compensateInput?.file_path}`);
  }
);
