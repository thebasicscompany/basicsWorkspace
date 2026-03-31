import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ---------------------------------------------------------------------------
// S3-compatible StorageService
// Works with AWS S3, MinIO, Cloudflare R2, Backblaze B2, etc.
// Config via env vars: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, S3_REGION
// ---------------------------------------------------------------------------

export interface UploadFileOptions {
  file: Buffer
  fileName: string
  contentType: string
  /** Logical context / prefix, e.g. "copilot", "execution" */
  context?: string
}

export interface UploadFileResult {
  path: string
  key: string
  size: number
  url?: string
}

// ---------------------------------------------------------------------------
// Lazy singleton — created on first use so the module can be imported even
// when env vars are not set (e.g. during build / tests).
// ---------------------------------------------------------------------------

let _client: S3Client | null = null

function getS3Config() {
  const endpoint = process.env.S3_ENDPOINT
  const bucket = process.env.S3_BUCKET
  const accessKey = process.env.S3_ACCESS_KEY
  const secretKey = process.env.S3_SECRET_KEY
  const region = process.env.S3_REGION || 'us-east-1'

  if (!endpoint || !bucket || !accessKey || !secretKey) {
    return null
  }

  return { endpoint, bucket, accessKey, secretKey, region }
}

function getClient(): S3Client {
  if (_client) return _client

  const cfg = getS3Config()
  if (!cfg) {
    throw new Error(
      'StorageService: S3 env vars not configured. ' +
        'Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY (and optionally S3_REGION).'
    )
  }

  _client = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKey,
      secretAccessKey: cfg.secretKey,
    },
    forcePathStyle: true, // Required for MinIO / R2 / most S3-compatible backends
  })

  return _client
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    throw new Error('StorageService: S3_BUCKET env var is not set.')
  }
  return bucket
}

/** Build the object key from context + fileName. */
function buildKey(fileName: string, context?: string): string {
  const prefix = context ? `${context}/` : ''
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${prefix}${timestamp}-${safeName}`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const StorageService = {
  /**
   * Upload a file buffer to S3-compatible storage.
   * Returns the storage key, a serveable path, and the file size.
   */
  async uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
    const client = getClient()
    const bucket = getBucket()
    const key = buildKey(options.fileName, options.context)

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: options.file,
        ContentType: options.contentType,
      })
    )

    return {
      path: `/api/files/${key}`,
      key,
      size: options.file.length,
    }
  },

  /**
   * Download a file from S3-compatible storage by its key.
   */
  async downloadFile(key: string): Promise<Buffer> {
    const client = getClient()
    const bucket = getBucket()

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    )

    if (!response.Body) {
      throw new Error(`StorageService: Empty response body for key "${key}"`)
    }

    const chunks: Uint8Array[] = []
    // @ts-expect-error — Body is a Readable stream in Node
    for await (const chunk of response.Body) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  },

  /**
   * Generate a pre-signed URL for direct access to a stored file.
   * Default expiry: 1 hour (3600s).
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const client = getClient()
    const bucket = getBucket()

    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn }
    )

    return url
  },

  /**
   * Delete a file from S3-compatible storage by its key.
   */
  async deleteFile(key: string): Promise<void> {
    const client = getClient()
    const bucket = getBucket()

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    )
  },

  /**
   * Check if the storage service is configured (env vars are set).
   */
  isConfigured(): boolean {
    return getS3Config() !== null
  },
}
