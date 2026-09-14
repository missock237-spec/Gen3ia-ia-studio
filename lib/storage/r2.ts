import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error("R2 configuration is incomplete");
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function client() {
  const { accountId, accessKeyId, secretAccessKey } = config();
  return new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
}

export async function putObject(options: { key: string; body: Uint8Array | Buffer; contentType: string; contentLength?: number }) {
  const { bucket } = config();
  await client().send(new PutObjectCommand({ Bucket: bucket, Key: options.key, Body: options.body, ContentType: options.contentType, ContentLength: options.contentLength }));
}

export async function deleteObject(key: string) {
  const { bucket } = config();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function createDownloadUrl(key: string, expiresIn = 600) {
  const { bucket } = config();
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}
