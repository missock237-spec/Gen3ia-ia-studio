import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getConfig() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error("R2 configuration is incomplete");
  return { accountId, accessKeyId, secretAccessKey, bucket };
}
function getClient() {
  const { accountId, accessKeyId, secretAccessKey } = getConfig();
  return new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
}
export async function uploadToR2(key: string, body: Uint8Array | Buffer, contentType: string): Promise<void> {
  const { bucket } = getConfig();
  await getClient().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, ContentLength: body.byteLength }));
}
export async function putObject(options: { key: string; body: Uint8Array | Buffer; contentType: string; contentLength?: number }) {
  return uploadToR2(options.key, options.body, options.contentType);
}
export async function downloadFromR2(key: string, maxBytes = 100 * 1024 * 1024): Promise<Buffer> {
  const { bucket } = getConfig();
  const response = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error("R2 object has no body");
  const bytes = await response.Body.transformToByteArray();
  if (bytes.byteLength > maxBytes) throw new Error("R2 object exceeds configured read limit");
  return Buffer.from(bytes);
}
export async function deleteFromR2(key: string): Promise<void> {
  const { bucket } = getConfig();
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
export async function deleteObject(key: string): Promise<void> { return deleteFromR2(key); }
export async function createR2DownloadUrl(key: string, expiresIn = 300): Promise<string> {
  const { bucket } = getConfig();
  if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 3600) throw new Error("Invalid signed URL expiration");
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}
export async function createDownloadUrl(key: string, expiresIn = 600): Promise<string> { return createR2DownloadUrl(key, expiresIn); }
