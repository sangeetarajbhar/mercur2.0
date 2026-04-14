import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { uploadFileToS3Step } from "./steps/upload-file-to-s3";

type UploadFileWorkflowInput = {
  file_name: string;
  content: string; // base64 encoded content
  mime_type?: string;
};

type UploadFileWorkflowOutput = {
  url: string;
  file_path: string;
};

export const uploadFileWorkflow = createWorkflow(
  "upload-file-workflow",
  (input: UploadFileWorkflowInput) => {
    const result = uploadFileToS3Step(input);
    
    return new WorkflowResponse(result);
  }
);
