import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Readable } from 'stream'
import { config } from '../config'

export const s3 = new S3Client({
  region: config.S3_REGION,
  ...(config.S3_ENDPOINT && {
    endpoint: config.S3_ENDPOINT,
    forcePathStyle: true, // required for MinIO
  }),
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY,
  },
})

/** Returns the public-facing URL for a stored object. */
export function getPublicUrl(key: string): string {
  if (config.S3_PUBLIC_URL) {
    return `${config.S3_PUBLIC_URL}/${key}`
  }
  return `https://${config.S3_BUCKET}.s3.${config.S3_REGION}.amazonaws.com/${key}`
}

/** Uploads a Buffer or stream; returns the S3 key. */
export async function uploadObject(
  key: string,
  body: Buffer | Readable,
  contentType: string,
): Promise<string> {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
  })
  await upload.done()
  return key
}

/** Deletes an object from S3. */
export async function deleteObject(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
  )
}

/** Generates a pre-signed GET URL valid for the given number of seconds. */
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
    { expiresIn },
  )
}

/** Uploads raw bytes synchronously (small payloads like QR images). */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  return key
}
