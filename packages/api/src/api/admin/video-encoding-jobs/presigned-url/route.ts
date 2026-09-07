import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'
import { randomUUID } from "crypto"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { s3Client } from '../../../../shared/utils/common'
import { VideoEncodingJobsPresignedUrlSchema } from '../validator'
import { z } from 'zod'

export const POST = async (
  req: AuthenticatedMedusaRequest<z.infer<typeof VideoEncodingJobsPresignedUrlSchema>>,
  res: MedusaResponse
) => {
  try {
    const { reference_type, file_name, file_type } = req.validatedBody
    const userId = req.auth_context?.actor_id

    if (!userId) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        'Unauthorized user'
      )
    }

    if (!reference_type || !file_name || !file_type) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Reference type, file name, and file type are required'
      )
    }

    const randomUUIDFilePath = randomUUID()
    const randomUUIDFileName = randomUUID()
    const fileExtension = file_name.split('.').pop()
    const uuidFileName = `${randomUUIDFileName}.${fileExtension}`
    const s3Path = `video/raw/${reference_type}/${randomUUIDFilePath}/${uuidFileName}`

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: s3Path,
      ContentType: file_type,
      Metadata: {
        's3-path': s3Path,
        'uploaded-by': userId,
        'reference-type': reference_type,
        'upload-time': new Date().toISOString(),
      },
    })

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 })

    res.status(200).json({
      presigned_url: presignedUrl,
      s3_path: s3Path,
      encoding_job_id: randomUUIDFilePath,
      file_name: file_name,
    })
  } catch (error) {
    if (error instanceof MedusaError) {
      res.status(error.type === MedusaError.Types.UNAUTHORIZED ? 401 : 400).json({
        message: error.message,
        type: error.type,
      })
      return
    }

    res.status(500).json({
      message: (error as Error).message || 'An unexpected error occurred',
      type: 'UNEXPECTED_ERROR',
    })
  }
}

