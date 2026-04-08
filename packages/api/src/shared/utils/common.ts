import {PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough } from 'stream';
import * as https from 'https';
import * as http from 'http';

// Create persistent HTTP agents for connection pooling
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50, // Allow up to 50 concurrent connections
  maxFreeSockets: 10, // Keep 10 idle sockets open
  timeout: 60000, // 60 second timeout
  keepAliveMsecs: 1000, // Send keep-alive probes every 1 second
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  keepAliveMsecs: 1000,
});

// Create a singleton S3 client with optimized settings and connection pooling
export const s3Client = new S3Client({
  region: process.env.S3_REGION,
  ...(process.env.NODE_ENV !== 'production' && {
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  }),
  ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
  maxAttempts: 3, // Reduce retry attempts for faster failures
  requestHandler: {
    httpsAgent, // Use persistent HTTPS agent
    httpAgent, // Use persistent HTTP agent (for local/non-SSL endpoints)
    connectionTimeout: 30000, // 30 second connection timeout
    socketTimeout: 30000, // 30 second socket timeout
  },
});

// Custom S3 upload function with full path support
export async function uploadToS3WithPath(
  filename: string,
  content: Buffer,
  mimeType?: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: filename,
    Body: content,
    ContentType: mimeType || 'application/octet-stream',
    ...(mimeType && mimeType.startsWith('image/') && {
      Metadata: {
        'processed': 'true',
        'upload-time': new Date().toISOString()
      }
    })
  });

  await s3Client.send(command);

  // Return the public URL
  if (process.env.S3_FILE_URL) {
    const baseUrl = process.env.S3_FILE_URL.endsWith('/') 
      ? process.env.S3_FILE_URL.slice(0, -1) 
      : process.env.S3_FILE_URL
    return `${baseUrl}/${filename}`
  }
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${filename}`;
}

// Helper function to construct full S3 URL from relative path
export function constructS3Url(relativePath: string): string {
  if (!relativePath) return '';

  // If it's already a full URL, return as is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // Construct full URL from relative path
  if (process.env.S3_FILE_URL) {
    const baseUrl = process.env.S3_FILE_URL.endsWith('/') 
      ? process.env.S3_FILE_URL.slice(0, -1) 
      : process.env.S3_FILE_URL
    return `${baseUrl}/${relativePath}`
  }
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${relativePath}`;
}

// Helper function to extract relative path from full S3 URL
export function extractRelativePath(fullUrl: string): string {
  if (!fullUrl) return '';

  // If it's already a relative path, return as is
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    return fullUrl;
  }

  // Extract everything after the domain name
  const match = fullUrl.match(/^https?:\/\/[^/]+\/(.+)$/);
  if (match && match[1]) {
    return match[1]; // Return everything after the domain
  }
  return fullUrl; // Return original if no match (shouldn't happen)
}

// Batch upload function for multiple files - returns relative paths only
export async function batchUploadToS3(
  uploads: Array<{ filename: string; content: Buffer; mimeType: string }>
): Promise<string[]> {
  const uploadPromises = uploads.map(({ filename, content, mimeType }) =>
    uploadToS3WithPath(filename, content, mimeType)
  );

  // Upload all files in parallel
  const results = await Promise.allSettled(uploadPromises);

  return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return extractRelativePath(result.value);
      } else {
        throw new Error(`Upload failed for ${uploads[index].filename}`);
      }
  });
}

/**
 * Streaming S3 upload for memory-efficient processing
 */
export async function batchUploadToS3Stream(
  uploads: Array<{
    filename: string
    stream: PassThrough
    mimeType: string
  }>
): Promise<string[]> {
  // Configurable upload timeout (default 60s)
  const UPLOAD_TIMEOUT = parseInt(process.env.S3_UPLOAD_TIMEOUT || "60000", 10)
  const MAX_RETRIES = 2

  // Limit concurrency to avoid memory pressure
  const MAX_CONCURRENT_UPLOADS = 5
  const results: string[] = []

  // Simple queue-based concurrency limiter
  const queue = [...uploads]
  const active: Array<Promise<string>> = []

  const runUpload = async (uploadItem: {
    filename: string
    stream: PassThrough
    mimeType: string
  }): Promise<string> => {
    const { filename, stream, mimeType } = uploadItem


    let attempt = 0

    while (attempt <= MAX_RETRIES) {
      try {
        attempt++

        const uploadPromise = new Upload({
          client: s3Client,
          params: {
            Bucket: process.env.S3_BUCKET!,
            Key: filename,
            Body: stream,
            ContentType: mimeType,
            Metadata: {
              processed: "true",
              "upload-time": new Date().toISOString(),
            },
          },
          partSize: 5 * 1024 * 1024,
          queueSize: 1,
        }).done()

        // Handle stream errors
        stream.on('error', () => {
          // Stream error will be caught in the catch block below
        })

        // Timeout protection
        await Promise.race([
          uploadPromise,
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(`S3 upload timeout for ${filename} (>${UPLOAD_TIMEOUT}ms)`)
                ),
              UPLOAD_TIMEOUT
            )
          ),
        ])

        return filename
      } catch (error: any) {
        const errorMessage = error?.message || String(error)

        if (attempt > MAX_RETRIES) {
          throw new Error(`Failed to upload ${filename} to S3 after ${MAX_RETRIES} retries: ${errorMessage}`)
        }

        // Wait a bit before retry
        await new Promise((r) => setTimeout(r, 1000 * attempt))
      }
    }
    
    throw new Error(`Failed to upload ${filename}`)
  }

  // Run with concurrency control - collect all promises
  const allUploadPromises: Array<Promise<string>> = []
  
  while (queue.length > 0 || active.length > 0) {
    // Start new uploads up to concurrency limit
    while (queue.length > 0 && active.length < MAX_CONCURRENT_UPLOADS) {
      const uploadItem = queue.shift()!
      const p = runUpload(uploadItem)
      active.push(p)
      allUploadPromises.push(p)
    }
    
    if (active.length > 0) {
      // Wait for at least one upload to complete
      const completedIndex = await Promise.race(
        active.map((p, i) => 
          p.then(() => i).catch(() => i)
        )
      )
      
      // Remove completed promise from active array
      const completedPromise = active[completedIndex]
      active.splice(completedIndex, 1)
      
      // Check if it succeeded (if it failed, error will be caught in final check)
      try {
        const value = await completedPromise
        results.push(value)
      } catch {
        // Error already logged in runUpload, will be caught in final check
      }
    }
  }

  // Wait for all uploads to complete and check for failures
  const allResults = await Promise.allSettled(allUploadPromises)
  
  const errors: Array<{ filename: string; error: string }> = []
  allResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (!results.includes(result.value)) {
        results.push(result.value)
      }
    } else {
      const uploadItem = uploads[index]
      errors.push({
        filename: uploadItem.filename,
        error: result.reason?.message || String(result.reason)
      })
    }
  })

  // If any uploads failed, throw an error
  if (errors.length > 0) {
    const errorMessages = errors.map(e => `${e.filename}: ${e.error}`).join('; ')
    throw new Error(`Failed to upload ${errors.length} file(s) to S3: ${errorMessages}`)
  }

  // Verify all uploads succeeded
  if (results.length !== uploads.length) {
    throw new Error(
      `Upload mismatch: expected ${uploads.length} uploads, but only ${results.length} succeeded`
    )
  }

  return results
}

/**
 * Convert Date to PostgreSQL timestamp format used by Medusa
 * Format: "YYYY-MM-DD HH:MM:SS.ssssss +00:00" (with microseconds)
 * @param date - The date to format
 * @returns Medusa-compatible PostgreSQL timestamp string
 */
export function toPostgresFormat(date: Date): string {
  // Convert to ISO string and transform to Medusa's expected format
  const isoString = date.toISOString();

  // Replace 'T' with space, add microseconds (000), and format timezone with space
  return isoString
    .replace('T', ' ')           // Replace T with space
    .replace('Z', '000 +00:00'); // Add microseconds and space before timezone
}
