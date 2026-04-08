import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { PassThrough } from "stream"
import * as https from "https"
import * as http from "http"

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  keepAliveMsecs: 1000,
})

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  keepAliveMsecs: 1000,
})

export const s3Client = new S3Client({
  region: process.env.S3_REGION,
  ...(process.env.NODE_ENV !== "production" && {
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  }),
  ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
  maxAttempts: 3,
  requestHandler: {
    httpsAgent,
    httpAgent,
    connectionTimeout: 30000,
    socketTimeout: 30000,
  } as any,
})

export async function uploadToS3WithPath(
  filename: string,
  content: Buffer,
  mimeType?: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: filename,
    Body: content,
    ContentType: mimeType || "application/octet-stream",
  })

  await s3Client.send(command)

  if (process.env.S3_FILE_URL) {
    const baseUrl = process.env.S3_FILE_URL.endsWith("/")
      ? process.env.S3_FILE_URL.slice(0, -1)
      : process.env.S3_FILE_URL
    return `${baseUrl}/${filename}`
  }
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${filename}`
}

export function constructS3Url(relativePath: string): string {
  if (!relativePath) return ""
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath
  }
  if (process.env.S3_FILE_URL) {
    const baseUrl = process.env.S3_FILE_URL.endsWith("/")
      ? process.env.S3_FILE_URL.slice(0, -1)
      : process.env.S3_FILE_URL
    return `${baseUrl}/${relativePath}`
  }
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${relativePath}`
}

export async function batchUploadToS3Stream(
  uploads: Array<{ filename: string; stream: PassThrough; mimeType: string }>
): Promise<string[]> {
  const MAX_CONCURRENT_UPLOADS = 5
  const queue = [...uploads]
  const active: Array<Promise<string>> = []
  const results: string[] = []

  const runUpload = async (uploadItem: {
    filename: string
    stream: PassThrough
    mimeType: string
  }): Promise<string> => {
    const uploadPromise = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.S3_BUCKET!,
        Key: uploadItem.filename,
        Body: uploadItem.stream,
        ContentType: uploadItem.mimeType,
      },
      partSize: 5 * 1024 * 1024,
      queueSize: 1,
    }).done()
    await uploadPromise
    return uploadItem.filename
  }

  while (queue.length > 0 || active.length > 0) {
    while (queue.length > 0 && active.length < MAX_CONCURRENT_UPLOADS) {
      const item = queue.shift()!
      const p = runUpload(item)
      active.push(p)
    }
    if (active.length > 0) {
      const completedIndex = await Promise.race(active.map((p, i) => p.then(() => i)))
      const done = active.splice(completedIndex, 1)[0]
      results.push(await done)
    }
  }

  return results
}

