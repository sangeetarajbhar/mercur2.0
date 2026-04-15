import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfigType,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import {
  FileTypes,
  Logger,
  S3FileServiceOptions,
} from "@medusajs/framework/types"
import {
  AbstractFileProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import path from "path"
import { Readable } from "stream"
import { ulid } from "ulid"

type InjectedDependencies = {
  logger: Logger
}

interface S3FileServiceConfig {
  fileUrl: string
  accessKeyId?: string
  secretAccessKey?: string
  authenticationMethod?: "access-key" | "s3-iam-role"
  region: string
  bucket: string
  prefix?: string
  endpoint?: string
  cacheControl?: string
  downloadFileDuration?: number
  additionalClientConfig?: Record<string, any>
}

const DEFAULT_UPLOAD_EXPIRATION_DURATION_SECONDS = 60 * 60

class S3FileNoAclService extends AbstractFileProviderService {
  static identifier = "s3-no-acl"
  protected config_: S3FileServiceConfig
  protected logger_: Logger
  protected client_: S3Client

  constructor({ logger }: InjectedDependencies, options: S3FileServiceOptions) {
    super()

    const authenticationMethod = options.authentication_method ?? "access-key"

    if (
      authenticationMethod === "access-key" &&
      (!options.access_key_id || !options.secret_access_key)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Access key ID and secret access key are required when using access key authentication`
      )
    }

    this.config_ = {
      fileUrl: options.file_url,
      accessKeyId: options.access_key_id,
      secretAccessKey: options.secret_access_key,
      authenticationMethod: authenticationMethod,
      region: options.region,
      bucket: options.bucket,
      prefix: options.prefix ?? "",
      endpoint: options.endpoint,
      cacheControl: options.cache_control ?? "public, max-age=31536000",
      downloadFileDuration: options.download_file_duration ?? 60 * 60,
      additionalClientConfig: options.additional_client_config ?? {},
    }
    this.logger_ = logger
    this.client_ = this.getClient()
  }

  protected getClient() {
    // Support both IAM roles and access keys
    // If credentials are undefined, AWS SDK will use default credential chain (IAM roles, etc.)
    const credentials =
      this.config_.authenticationMethod === "access-key" &&
      this.config_.accessKeyId &&
      this.config_.secretAccessKey
        ? {
            accessKeyId: this.config_.accessKeyId!,
            secretAccessKey: this.config_.secretAccessKey!,
          }
        : undefined

    const config: S3ClientConfigType = {
      credentials,
      region: this.config_.region,
      endpoint: this.config_.endpoint,
      ...this.config_.additionalClientConfig,
    }

    return new S3Client(config)
  }

  async upload(
    file: FileTypes.ProviderUploadFileDTO
  ): Promise<FileTypes.ProviderFileResultDTO> {
    if (!file) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `No file provided`)
    }

    if (!file.filename) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No filename provided`
      )
    }

    const parsedFilename = path.parse(file.filename)
    const fileKey = `${this.config_.prefix}${parsedFilename.name}-${ulid()}${
      parsedFilename.ext
    }`

    let content: Buffer
    try {
      const decoded = Buffer.from(file.content, "base64")
      if (decoded.toString("base64") === file.content) {
        content = decoded
      } else {
        content = Buffer.from(file.content, "utf8")
      }
    } catch {
      content = Buffer.from(file.content, "binary")
    }

    // NO ACL - this is the key fix for production buckets with ACL disabled
    const command = new PutObjectCommand({
      Bucket: this.config_.bucket,
      Body: content,
      Key: fileKey,
      ContentType: file.mimeType,
      CacheControl: this.config_.cacheControl,
      Metadata: {
        "original-filename": encodeURIComponent(file.filename),
      },
    })

    try {
      await this.client_.send(command)
    } catch (e) {
      this.logger_.error(e)
      throw e
    }

    return {
      url: `${this.config_.fileUrl}/${encodeURIComponent(fileKey)}`,
      key: fileKey,
    }
  }


  async delete(
    files: FileTypes.ProviderDeleteFileDTO | FileTypes.ProviderDeleteFileDTO[]
  ): Promise<void> {
    try {
      if (Array.isArray(files)) {
        await this.client_.send(
          new DeleteObjectsCommand({
            Bucket: this.config_.bucket,
            Delete: {
              Objects: files.map((file) => ({
                Key: file.fileKey,
              })),
              Quiet: true,
            },
          })
        )
      } else {
        await this.client_.send(
          new DeleteObjectCommand({
            Bucket: this.config_.bucket,
            Key: files.fileKey,
          })
        )
      }
    } catch (e) {
      this.logger_.error(e)
    }
  }

  async getPresignedDownloadUrl(
    fileData: FileTypes.ProviderGetFileDTO
  ): Promise<string> {
    // TODO: Allow passing content disposition when getting a presigned URL
    const command = new GetObjectCommand({
      Bucket: this.config_.bucket,
      Key: `${fileData.fileKey}`,
    })

    return await getSignedUrl(this.client_, command, {
      expiresIn: this.config_.downloadFileDuration,
    })
  }

  // Note: Some providers (eg. AWS S3) allows IAM policies to further restrict what can be uploaded.
  async getPresignedUploadUrl(
    fileData: FileTypes.ProviderGetPresignedUploadUrlDTO
  ): Promise<FileTypes.ProviderFileResultDTO> {
    if (!fileData?.filename) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No filename provided`
      )
    }

    const fileKey = `${this.config_.prefix}${fileData.filename}`

    // NO ACL - this is the key fix for production buckets with ACL disabled
    // Using content-type, acl, etc. doesn't work with all providers, and some simply ignore it.
    const command = new PutObjectCommand({
      Bucket: this.config_.bucket,
      ContentType: fileData.mimeType,
      Key: fileKey,
    })

    const signedUrl = await getSignedUrl(this.client_, command, {
      expiresIn:
        fileData.expiresIn ?? DEFAULT_UPLOAD_EXPIRATION_DURATION_SECONDS,
    })

    return {
      url: signedUrl,
      key: fileKey,
    }
  }


  async getDownloadStream(
    file: FileTypes.ProviderGetFileDTO
  ): Promise<Readable> {
    if (!file?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No fileKey provided`
      )
    }

    const response = await this.client_.send(
      new GetObjectCommand({
        Key: file.fileKey,
        Bucket: this.config_.bucket,
      })
    )

    return response.Body! as Readable
  }

  async getAsBuffer(file: FileTypes.ProviderGetFileDTO): Promise<Buffer> {
    if (!file?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No fileKey provided`
      )
    }

    const response = await this.client_.send(
      new GetObjectCommand({
        Key: file.fileKey,
        Bucket: this.config_.bucket,
      })
    )

    return Buffer.from(await response.Body!.transformToByteArray())
  }
}

export default S3FileNoAclService