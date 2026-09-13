import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId) {
    throw new Error("R2_ACCOUNT_ID is missing");
  }

  if (!accessKeyId) {
    throw new Error("R2_ACCESS_KEY_ID is missing");
  }

  if (!secretAccessKey) {
    throw new Error("R2_SECRET_ACCESS_KEY is missing");
  }

  if (!bucket) {
    throw new Error("R2_BUCKET is missing");
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
  };
}

function createR2Client() {
  const config = getR2Config();

  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
) {
  const config = getR2Config();
  const client = createR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
    }),
  );

  return {
    key,
    bucket: config.bucket,
  };
}

export async function deleteFromR2(key: string) {
  const config = getR2Config();
  const client = createR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );
}

export async function createR2DownloadUrl(
  key: string,
  expiresIn = 300,
) {
  const config = getR2Config();
  const client = createR2Client();

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  return getSignedUrl(client, command, {
    expiresIn,
  });
}
